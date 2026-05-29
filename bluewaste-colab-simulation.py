import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.cluster import KMeans
from IPython.display import display

np.random.seed(42)

required_columns = [
    "report_id",
    "date",
    "barangay",
    "category",
    "status",
    "latitude",
    "longitude",
    "analysis_confidence",
]

uploaded_file = None

try:
    from google.colab import files

    print("Upload bluewaste-colab-dataset.csv when prompted.")
    uploaded = files.upload()
    if uploaded:
        uploaded_file = next(iter(uploaded.keys()))
except Exception:
    uploaded_file = "bluewaste-colab-dataset.csv"

if uploaded_file is None:
    uploaded_file = "bluewaste-colab-dataset.csv"

df = pd.read_csv(uploaded_file)

missing_columns = [column for column in required_columns if column not in df.columns]
if missing_columns:
    raise ValueError(f"Missing required columns in CSV: {missing_columns}")

df["date"] = pd.to_datetime(df["date"])
df["week"] = df["date"].dt.to_period("W").astype(str)

barangays = ["Cagangohan", "San Pedro", "San Vicente"]
categories = [
    "Plastic Waste",
    "Organic Waste",
    "Glass Waste",
    "Metal Waste",
    "Paper Waste",
    "Fishing Gear Waste",
    "Textile Waste",
]

df["barangay"] = pd.Categorical(df["barangay"], categories=barangays, ordered=True)
df["category"] = pd.Categorical(df["category"], categories=categories, ordered=True)

print("Sample dataset preview:")
display(df.head())

print("Daily report totals preview:")
display(df.groupby(df["date"].dt.date).size().rename("report_count").sort_index().head(12))

# --------------------------------------------------
# 2) Expected outcomes: report volume over time
# --------------------------------------------------
daily_counts = df.groupby(df["date"].dt.date).size()

plt.figure(figsize=(12, 5))
plt.plot(daily_counts.index, daily_counts.values, color="#1f77b4", linewidth=2, marker="o")
plt.title("BlueWaste Simulation: Reports Over Time")
plt.xlabel("Date")
plt.ylabel("Number of Reports")
plt.xticks(rotation=45)
plt.tight_layout()
plt.show()

# --------------------------------------------------
# 3) Category distribution
# --------------------------------------------------
category_counts = df["category"].value_counts()

plt.figure(figsize=(10, 5))
sns.barplot(x=category_counts.index, y=category_counts.values, hue=category_counts.index, palette="viridis", legend=False)
plt.title("BlueWaste Simulation: Waste Category Distribution")
plt.xlabel("Category")
plt.ylabel("Count")
plt.xticks(rotation=25, ha="right")
plt.tight_layout()
plt.show()

# --------------------------------------------------
# 4) Status distribution
# --------------------------------------------------
status_counts = df["status"].value_counts()

plt.figure(figsize=(7, 7))
plt.pie(
    status_counts.values,
    labels=status_counts.index,
    autopct="%1.1f%%",
    startangle=140,
    colors=sns.color_palette("Set2", len(status_counts)),
)
plt.title("BlueWaste Simulation: Report Status Distribution")
plt.tight_layout()
plt.show()

# --------------------------------------------------
# 5) Spatial clustering demonstration
# --------------------------------------------------
coords = df[["latitude", "longitude"]].copy()
kmeans = KMeans(n_clusters=3, random_state=42, n_init=10)
df["cluster"] = kmeans.fit_predict(coords)

plt.figure(figsize=(8, 6))
sns.scatterplot(
    data=df,
    x="longitude",
    y="latitude",
    hue="cluster",
    palette="tab10",
    s=70,
)
plt.scatter(
    kmeans.cluster_centers_[:, 1],
    kmeans.cluster_centers_[:, 0],
    c="black",
    s=200,
    marker="X",
    label="Cluster Centers",
)
plt.title("BlueWaste Simulation: Spatial Clustering of Waste Reports")
plt.xlabel("Longitude")
plt.ylabel("Latitude")
plt.legend()
plt.tight_layout()
plt.show()

# --------------------------------------------------
# 6) Weekly trend summary for presentation
# --------------------------------------------------
weekly_counts = df.groupby("week").size().reset_index(name="report_count")
print("Weekly report summary:")
display(weekly_counts.head(10))

print("\nShort graph explanations:")
print("- Reports Over Time: shows how many reports were filed on each date, so higher peaks mean busier days.")
print("- Waste Category Distribution: shows which waste type appears most often in the dataset.")
print("- Report Status Distribution: shows the proportion of each status, such as Pending, Verified, or Cleaned.")
print("- Spatial Clustering: shows where reports are grouped geographically, helping identify hotspot areas.")