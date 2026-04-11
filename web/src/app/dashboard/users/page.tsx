"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  useUsers,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
  UserRecord,
} from "@/hooks/useUsers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Barangay } from "@/types";
import api from "@/lib/api";
import { formatDateTime } from "@/lib/utils";
import {
  DataTableSkeleton,
  FilterToolbarSkeleton,
  PageHeadingSkeleton,
} from "@/components/skeletons/page-skeletons";

const ROLE_LABELS: Record<string, string> = {
  LGU_ADMIN: "Admin",
  RESORT_ADMIN: "Resort Admin",
  FIELD_WORKER: "Field Worker",
  CITIZEN: "Citizen",
};

const ROLE_BADGE_CLASSES: Record<string, string> = {
  LGU_ADMIN: "bg-blue-100 text-blue-800",
  RESORT_ADMIN: "bg-indigo-100 text-indigo-800",
  FIELD_WORKER: "bg-green-100 text-green-800",
  CITIZEN: "bg-gray-100 text-gray-700",
};

const ROLES = ["LGU_ADMIN", "RESORT_ADMIN", "FIELD_WORKER", "CITIZEN"] as const;

type Role = (typeof ROLES)[number];

interface UserFormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: Role;
  phone: string;
  barangayId: string;
}

const emptyForm: UserFormData = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  role: "CITIZEN",
  phone: "",
  barangayId: "",
};

export default function UsersPage() {
  const [page, setPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const [showAddModal, setShowAddModal] = useState(false);
  const [editUser, setEditUser] = useState<UserRecord | null>(null);
  const [deleteUser, setDeleteUser] = useState<UserRecord | null>(null);

  const [form, setForm] = useState<UserFormData>(emptyForm);
  const [formError, setFormError] = useState("");

  const { data, isLoading } = useUsers({
    page,
    limit: 15,
    role: roleFilter || undefined,
    search: search || undefined,
  });

  const { data: barangays = [] } = useQuery<Barangay[]>({
    queryKey: ["barangays"],
    queryFn: async () => {
      const { data } = await api.get("/barangays");
      return data;
    },
  });

  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const deleteUserMutation = useDeleteUser();

  const users = data?.data || [];
  const pagination = data?.pagination;

  if (isLoading) {
    return (
      <div>
        <div className="mb-6 flex items-center justify-between">
          <PageHeadingSkeleton withSubtitle={false} />
        </div>
        <FilterToolbarSkeleton blocks={1} />
        <DataTableSkeleton rows={8} cols={8} />
      </div>
    );
  }

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(1);
  };

  const openAdd = () => {
    setForm(emptyForm);
    setFormError("");
    setShowAddModal(true);
  };

  const openEdit = (user: UserRecord) => {
    setForm({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      password: "",
      role: user.role as Role,
      phone: user.phone || "",
      barangayId: user.barangay?.id || "",
    });
    setFormError("");
    setEditUser(user);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!form.firstName || !form.lastName || !form.email || !form.password) {
      setFormError("Please fill in all required fields.");
      return;
    }
    if (form.password.length < 6) {
      setFormError("Password must be at least 6 characters.");
      return;
    }

    try {
      await createUser.mutateAsync({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        password: form.password,
        role: form.role,
        phone: form.phone || undefined,
        barangayId: form.barangayId || undefined,
      });
      setShowAddModal(false);
    } catch (err: any) {
      setFormError(
        err?.response?.data?.error || "Failed to create user. Try again.",
      );
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;
    setFormError("");

    if (!form.firstName || !form.lastName || !form.email) {
      setFormError("Please fill in all required fields.");
      return;
    }

    try {
      await updateUser.mutateAsync({
        id: editUser.id,
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        role: form.role,
        phone: form.phone || undefined,
        barangayId: form.barangayId || undefined,
      });
      setEditUser(null);
    } catch (err: any) {
      setFormError(
        err?.response?.data?.error || "Failed to update user. Try again.",
      );
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteUser) return;
    try {
      await deleteUserMutation.mutateAsync(deleteUser.id);
      setDeleteUser(null);
    } catch {
      // error silently dismissed; toast can be added
    }
  };

  const field = (
    label: string,
    key: keyof UserFormData,
    type = "text",
    required = false,
  ) => (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      <Input
        type={type}
        value={form[key] as string}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        className="w-full"
      />
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">User Management</h1>
          {pagination && (
            <p className="mt-0.5 text-sm text-gray-500">
              {pagination.total} total user{pagination.total !== 1 ? "s" : ""}
            </p>
          )}
        </div>
        <Button onClick={openAdd}>+ Add User</Button>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Role
          </label>
          <select
            title="Filter by role"
            className="rounded-md border px-3 py-2 text-sm"
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Roles</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-end gap-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Search
            </label>
            <Input
              placeholder="Name or email..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="w-56"
            />
          </div>
          <Button size="sm" onClick={handleSearch}>
            Search
          </Button>
        </div>

        {(roleFilter || search) && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setRoleFilter("");
              setSearch("");
              setSearchInput("");
              setPage(1);
            }}
          >
            Clear Filters
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                Email
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                Role
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                Barangay
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                Phone
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                Joined
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-10 text-center text-gray-400"
                >
                  Loading...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-10 text-center text-gray-400"
                >
                  No users found
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-800">
                    {user.firstName} {user.lastName}
                  </td>
                  <td className="max-w-[180px] truncate px-4 py-3 text-sm text-gray-600">
                    {user.email}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${ROLE_BADGE_CLASSES[user.role] ?? "bg-gray-100 text-gray-700"}`}
                    >
                      {ROLE_LABELS[user.role] ?? user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {user.barangay?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {user.phone || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${user.isActive ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-700"}`}
                    >
                      {user.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                    {formatDateTime(user.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEdit(user)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        className="bg-red-600 hover:bg-red-700 text-white"
                        onClick={() => setDeleteUser(user)}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Page {pagination.page} of {pagination.totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-5 text-lg font-semibold text-gray-800">
              Add New User
            </h3>
            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {field("First Name", "firstName", "text", true)}
                {field("Last Name", "lastName", "text", true)}
              </div>
              {field("Email", "email", "email", true)}
              {field("Password", "password", "password", true)}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Role <span className="text-red-500">*</span>
                  </label>
                  <select
                    title="Select role"
                    className="w-full rounded-md border px-3 py-2 text-sm"
                    value={form.role}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, role: e.target.value as Role }))
                    }
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABELS[r]}
                      </option>
                    ))}
                  </select>
                </div>
                {field("Phone", "phone")}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Barangay
                </label>
                <select
                  title="Select barangay"
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  value={form.barangayId}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, barangayId: e.target.value }))
                  }
                >
                  <option value="">— None —</option>
                  {barangays.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              {formError && <p className="text-sm text-red-600">{formError}</p>}

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createUser.isPending}>
                  {createUser.isPending ? "Creating..." : "Create User"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setEditUser(null)}
        >
          <div
            className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-5 text-lg font-semibold text-gray-800">
              Edit User
            </h3>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {field("First Name", "firstName", "text", true)}
                {field("Last Name", "lastName", "text", true)}
              </div>
              {field("Email", "email", "email", true)}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Role <span className="text-red-500">*</span>
                  </label>
                  <select
                    title="Select role"
                    className="w-full rounded-md border px-3 py-2 text-sm"
                    value={form.role}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, role: e.target.value as Role }))
                    }
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABELS[r]}
                      </option>
                    ))}
                  </select>
                </div>
                {field("Phone", "phone")}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Barangay
                </label>
                <select
                  title="Select barangay"
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  value={form.barangayId}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, barangayId: e.target.value }))
                  }
                >
                  <option value="">— None —</option>
                  {barangays.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              {formError && <p className="text-sm text-red-600">{formError}</p>}

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditUser(null)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={updateUser.isPending}>
                  {updateUser.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setDeleteUser(null)}
        >
          <div
            className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-2 text-lg font-semibold text-gray-800">
              Delete User
            </h3>
            <p className="mb-6 text-sm text-gray-600">
              Are you sure you want to permanently delete{" "}
              <span className="font-medium">
                {deleteUser.firstName} {deleteUser.lastName}
              </span>
              ? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setDeleteUser(null)}>
                Cancel
              </Button>
              <Button
                className="bg-red-600 hover:bg-red-700 text-white"
                disabled={deleteUserMutation.isPending}
                onClick={handleDeleteConfirm}
              >
                {deleteUserMutation.isPending ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
