"use client";

import { useState } from "react";
import {
  Users,
  Shield,
  Lock,
  Crown,
  UserPlus,
  Pencil,
  CheckCircle,
  AlertCircle,
  Save,
  Mail,
  KeyRound,
  Clock,
} from "lucide-react";
import { Card, Button, Input, Select, Badge, Modal } from "@/components/ui";
import { toast } from "@/components/ui/toast";

interface StaffMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: "SUPER_ADMIN" | "ADMIN";
  isActive: boolean;
  lastLogin: string;
}

const superAdminPermissions = [
  "Manage products and inventory",
  "Manage orders and fulfillment",
  "Manage customers",
  "Manage content and blog",
  "Manage discounts and promotions",
  "View and export analytics",
  "Manage store settings",
  "Manage staff accounts",
  "Manage billing and payments",
];

const adminPermissions = [
  "Manage products and inventory",
  "Manage orders and fulfillment",
  "Manage customers",
  "Manage content and blog",
  "Manage discounts and promotions",
  "View and export analytics",
];

const adminRestrictions = [
  "Cannot manage store settings",
  "Cannot manage staff accounts",
  "Cannot manage billing and payments",
];

export default function UsersPermissionsPage() {
  const [staff, setStaff] = useState<StaffMember[]>([
    {
      id: "1",
      firstName: "Sahil",
      lastName: "Yadav",
      email: "ysahil816@gmail.com",
      role: "SUPER_ADMIN",
      isActive: true,
      lastLogin: "Just now",
    },
  ]);

  const [requireEmailVerification, setRequireEmailVerification] = useState(true);
  const [enforceStrongPasswords, setEnforceStrongPasswords] = useState(true);
  const [sessionTimeout, setSessionTimeout] = useState("60");
  const [saving, setSaving] = useState(false);

  // Add staff modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addFirstName, setAddFirstName] = useState("");
  const [addLastName, setAddLastName] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addRole, setAddRole] = useState<"SUPER_ADMIN" | "ADMIN">("ADMIN");

  // Edit staff modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState<"SUPER_ADMIN" | "ADMIN">("ADMIN");

  const handleSave = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 500));
    toast.success("User settings saved");
    setSaving(false);
  };

  const handleAddStaff = () => {
    if (!addFirstName || !addLastName || !addEmail) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addEmail)) {
      toast.error("Please enter a valid email address");
      return;
    }
    const newStaff: StaffMember = {
      id: Math.random().toString(36).slice(2),
      firstName: addFirstName,
      lastName: addLastName,
      email: addEmail,
      role: addRole,
      isActive: true,
      lastLogin: "Never",
    };
    setStaff((prev) => [...prev, newStaff]);
    setShowAddModal(false);
    setAddFirstName("");
    setAddLastName("");
    setAddEmail("");
    setAddRole("ADMIN");
    toast.success("Staff member added");
  };

  const openEditModal = (member: StaffMember) => {
    setEditingStaff(member);
    setEditFirstName(member.firstName);
    setEditLastName(member.lastName);
    setEditEmail(member.email);
    setEditRole(member.role);
    setShowEditModal(true);
  };

  const handleEditStaff = () => {
    if (!editingStaff || !editFirstName || !editLastName || !editEmail) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editEmail)) {
      toast.error("Please enter a valid email address");
      return;
    }
    setStaff((prev) =>
      prev.map((m) =>
        m.id === editingStaff.id
          ? {
              ...m,
              firstName: editFirstName,
              lastName: editLastName,
              email: editEmail,
              role: editRole,
            }
          : m
      )
    );
    setShowEditModal(false);
    setEditingStaff(null);
    toast.success("Staff member updated");
  };

  const toggleStaffActive = (id: string) => {
    setStaff((prev) =>
      prev.map((m) => (m.id === id ? { ...m, isActive: !m.isActive } : m))
    );
    const member = staff.find((m) => m.id === id);
    if (member) {
      toast.success(
        `${member.firstName} ${member.lastName} ${member.isActive ? "deactivated" : "activated"}`
      );
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-charcoal">Users & permissions</h2>
          <p className="text-sm text-medium-gray mt-0.5">
            Manage staff accounts and access control
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save size={16} />
          {saving ? "Saving..." : "Save"}
        </Button>
      </div>

      {/* Store owner */}
      <Card>
        <div className="space-y-5">
          <div className="flex items-center gap-2">
            <Crown size={16} className="text-deep-earth" />
            <h3 className="text-sm font-semibold text-charcoal">Store owner</h3>
          </div>

          <div className="flex items-start gap-4 p-4 bg-off-white rounded-lg border border-light-gray">
            <div className="w-10 h-10 rounded-full bg-deep-earth/10 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-deep-earth">SY</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <p className="text-sm font-semibold text-charcoal">Sahil Yadav</p>
                <Badge variant="info">Owner</Badge>
              </div>
              <p className="text-sm text-medium-gray">ysahil816@gmail.com</p>
            </div>
          </div>

          <div className="flex items-start gap-2 p-3 bg-off-white rounded-lg">
            <AlertCircle size={14} className="text-medium-gray mt-0.5 flex-shrink-0" />
            <p className="text-xs text-medium-gray">
              The store owner has unrestricted access to all admin features, including
              settings, billing, and staff management.
            </p>
          </div>
        </div>
      </Card>

      {/* Staff accounts */}
      <Card padding={false}>
        <div className="p-6 pb-0">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-deep-earth" />
              <h3 className="text-sm font-semibold text-charcoal">Staff accounts</h3>
            </div>
            <Button size="sm" onClick={() => setShowAddModal(true)}>
              <UserPlus size={14} />
              Add staff
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-y border-light-gray bg-off-white/50">
                <th className="text-left px-6 py-3 font-medium text-medium-gray">Name</th>
                <th className="text-left px-6 py-3 font-medium text-medium-gray">Email</th>
                <th className="text-left px-6 py-3 font-medium text-medium-gray">Role</th>
                <th className="text-left px-6 py-3 font-medium text-medium-gray">Status</th>
                <th className="text-left px-6 py-3 font-medium text-medium-gray">Last login</th>
                <th className="text-right px-6 py-3 font-medium text-medium-gray">Actions</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((member) => (
                <tr
                  key={member.id}
                  className="border-b border-light-gray last:border-0 hover:bg-off-white/50"
                >
                  <td className="px-6 py-3">
                    <span className="font-medium text-charcoal">
                      {member.firstName} {member.lastName}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-dark-gray">{member.email}</td>
                  <td className="px-6 py-3">
                    <Badge variant={member.role === "SUPER_ADMIN" ? "info" : "default"}>
                      {member.role === "SUPER_ADMIN" ? "Super Admin" : "Admin"}
                    </Badge>
                  </td>
                  <td className="px-6 py-3">
                    <Badge variant={member.isActive ? "success" : "error"}>
                      {member.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td className="px-6 py-3 text-dark-gray">{member.lastLogin}</td>
                  <td className="px-6 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEditModal(member)}
                        className="p-1.5 rounded-md hover:bg-off-white transition-colors"
                        title="Edit"
                      >
                        <Pencil size={14} className="text-dark-gray" />
                      </button>
                      <button
                        onClick={() => toggleStaffActive(member.id)}
                        className="p-1.5 rounded-md hover:bg-off-white transition-colors"
                        type="button"
                        title={member.isActive ? "Deactivate" : "Activate"}
                      >
                        <div
                          className={`relative w-8 h-[18px] rounded-full transition-colors ${
                            member.isActive ? "bg-forest-green" : "bg-light-gray"
                          }`}
                        >
                          <div
                            className={`absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white shadow transition-transform ${
                              member.isActive ? "translate-x-[14px]" : "translate-x-[2px]"
                            }`}
                          />
                        </div>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {staff.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-medium-gray">
                    No staff accounts yet. Click &quot;Add staff&quot; to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Permissions */}
      <Card>
        <div className="space-y-5">
          <div className="flex items-center gap-2">
            <Shield size={16} className="text-deep-earth" />
            <h3 className="text-sm font-semibold text-charcoal">Permissions</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Super Admin role */}
            <div className="p-4 rounded-lg border border-light-gray bg-off-white/50">
              <div className="flex items-center gap-2 mb-1">
                <Shield size={14} className="text-deep-earth" />
                <h4 className="text-sm font-semibold text-charcoal">Super Admin</h4>
              </div>
              <p className="text-xs text-medium-gray mb-3">
                Full access to all admin features, settings, and staff management.
              </p>
              <ul className="space-y-1.5">
                {superAdminPermissions.map((perm) => (
                  <li key={perm} className="flex items-center gap-2 text-xs text-dark-gray">
                    <CheckCircle size={12} className="text-success flex-shrink-0" />
                    {perm}
                  </li>
                ))}
              </ul>
            </div>

            {/* Admin role */}
            <div className="p-4 rounded-lg border border-light-gray bg-off-white/50">
              <div className="flex items-center gap-2 mb-1">
                <Users size={14} className="text-deep-earth" />
                <h4 className="text-sm font-semibold text-charcoal">Admin</h4>
              </div>
              <p className="text-xs text-medium-gray mb-3">
                Can manage products, orders, customers, and content. Cannot manage settings
                or staff.
              </p>
              <ul className="space-y-1.5">
                {adminPermissions.map((perm) => (
                  <li key={perm} className="flex items-center gap-2 text-xs text-dark-gray">
                    <CheckCircle size={12} className="text-success flex-shrink-0" />
                    {perm}
                  </li>
                ))}
                {adminRestrictions.map((perm) => (
                  <li key={perm} className="flex items-center gap-2 text-xs text-medium-gray">
                    <AlertCircle size={12} className="text-medium-gray flex-shrink-0" />
                    {perm}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </Card>

      {/* Login security */}
      <Card>
        <div className="space-y-5">
          <div className="flex items-center gap-2">
            <Lock size={16} className="text-deep-earth" />
            <h3 className="text-sm font-semibold text-charcoal">Login security</h3>
          </div>

          <div className="space-y-4">
            {/* Require email verification */}
            <div className="flex items-center justify-between">
              <div className="flex items-start gap-3">
                <Mail size={16} className="text-medium-gray mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-charcoal">
                    Require email verification for new staff
                  </p>
                  <p className="text-xs text-medium-gray mt-0.5">
                    New staff members must verify their email before accessing the admin
                  </p>
                </div>
              </div>
              <button
                onClick={() => setRequireEmailVerification(!requireEmailVerification)}
                type="button"
                aria-label="Toggle email verification requirement"
              >
                <div
                  className={`relative w-9 h-5 rounded-full transition-colors ${
                    requireEmailVerification ? "bg-forest-green" : "bg-light-gray"
                  }`}
                >
                  <div
                    className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                      requireEmailVerification ? "translate-x-4" : "translate-x-0.5"
                    }`}
                  />
                </div>
              </button>
            </div>

            <div className="border-t border-light-gray" />

            {/* Enforce strong passwords */}
            <div className="flex items-center justify-between">
              <div className="flex items-start gap-3">
                <KeyRound size={16} className="text-medium-gray mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-charcoal">
                    Enforce strong passwords
                  </p>
                  <p className="text-xs text-medium-gray mt-0.5">
                    Require minimum 8 characters with uppercase, lowercase, numbers, and symbols
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEnforceStrongPasswords(!enforceStrongPasswords)}
                type="button"
                aria-label="Toggle strong password enforcement"
              >
                <div
                  className={`relative w-9 h-5 rounded-full transition-colors ${
                    enforceStrongPasswords ? "bg-forest-green" : "bg-light-gray"
                  }`}
                >
                  <div
                    className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                      enforceStrongPasswords ? "translate-x-4" : "translate-x-0.5"
                    }`}
                  />
                </div>
              </button>
            </div>

            <div className="border-t border-light-gray" />

            {/* Session timeout */}
            <div className="flex items-start gap-3">
              <Clock size={16} className="text-medium-gray mt-2" />
              <div className="flex-1">
                <Input
                  label="Session timeout (minutes)"
                  type="number"
                  value={sessionTimeout}
                  onChange={(e) => setSessionTimeout(e.target.value)}
                  placeholder="60"
                />
              </div>
            </div>

            <div className="flex items-start gap-2 p-3 bg-off-white rounded-lg">
              <AlertCircle size={14} className="text-medium-gray mt-0.5 flex-shrink-0" />
              <p className="text-xs text-medium-gray">
                Staff members are automatically logged out after the session timeout period
                of inactivity. Set to 0 to disable automatic logout.
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Add staff modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setAddFirstName("");
          setAddLastName("");
          setAddEmail("");
          setAddRole("ADMIN");
        }}
        title="Add staff member"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="First name"
              value={addFirstName}
              onChange={(e) => setAddFirstName(e.target.value)}
              placeholder="First name"
            />
            <Input
              label="Last name"
              value={addLastName}
              onChange={(e) => setAddLastName(e.target.value)}
              placeholder="Last name"
            />
          </div>
          <Input
            label="Email"
            type="email"
            value={addEmail}
            onChange={(e) => setAddEmail(e.target.value)}
            placeholder="staff@example.com"
          />
          <Select
            label="Role"
            value={addRole}
            onChange={(e) => setAddRole(e.target.value as "SUPER_ADMIN" | "ADMIN")}
            options={[
              { value: "ADMIN", label: "Admin" },
              { value: "SUPER_ADMIN", label: "Super Admin" },
            ]}
          />

          <div className="flex items-start gap-2 p-3 bg-off-white rounded-lg">
            <AlertCircle size={14} className="text-medium-gray mt-0.5 flex-shrink-0" />
            <p className="text-xs text-medium-gray">
              An invitation email will be sent to the staff member with instructions
              to set up their account.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="ghost"
              onClick={() => {
                setShowAddModal(false);
                setAddFirstName("");
                setAddLastName("");
                setAddEmail("");
                setAddRole("ADMIN");
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleAddStaff}>
              <UserPlus size={14} />
              Add staff
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit staff modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingStaff(null);
        }}
        title="Edit staff member"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="First name"
              value={editFirstName}
              onChange={(e) => setEditFirstName(e.target.value)}
              placeholder="First name"
            />
            <Input
              label="Last name"
              value={editLastName}
              onChange={(e) => setEditLastName(e.target.value)}
              placeholder="Last name"
            />
          </div>
          <Input
            label="Email"
            type="email"
            value={editEmail}
            onChange={(e) => setEditEmail(e.target.value)}
            placeholder="staff@example.com"
          />
          <Select
            label="Role"
            value={editRole}
            onChange={(e) => setEditRole(e.target.value as "SUPER_ADMIN" | "ADMIN")}
            options={[
              { value: "ADMIN", label: "Admin" },
              { value: "SUPER_ADMIN", label: "Super Admin" },
            ]}
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="ghost"
              onClick={() => {
                setShowEditModal(false);
                setEditingStaff(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleEditStaff}>
              <Save size={14} />
              Save changes
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
