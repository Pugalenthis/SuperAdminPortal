import { useQuery } from "@tanstack/react-query";
import { Admin } from "@/types";
import { Button } from "@/components/ui/button";
import { PlusCircle, PencilIcon, Trash2, UsersRound } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { CreateAdminModal } from "./create-admin-modal";
import { DeleteConfirmModal } from "./delete-confirm-modal";

export function AdminList() {
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null);

  const { data: admins, isLoading, isError } = useQuery<Admin[]>({
    queryKey: ["/api/admins"],
  });

  const handleDeleteClick = (admin: Admin) => {
    setSelectedAdmin(admin);
    setDeleteModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-neutral-900">Admin Organizations</h2>
            <p className="text-neutral-600 mt-1">Manage organization accounts on the platform</p>
          </div>
          <Button className="mt-4 sm:mt-0">
            <PlusCircle className="h-4 w-4 mr-2" />
            Create Admin
          </Button>
        </div>

        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <div className="p-8 text-center">
            <div className="inline-flex items-center space-x-2">
              <div className="h-5 w-5 rounded-full bg-primary/20 animate-pulse" />
              <span className="text-neutral-600">Loading admin organizations...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center p-8">
        <div className="text-red-500 mb-4">Failed to load admin organizations</div>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900">Admin Organizations</h2>
          <p className="text-neutral-600 mt-1">Manage organization accounts on the platform</p>
        </div>
        
        <Button className="mt-4 sm:mt-0" onClick={() => setCreateModalOpen(true)}>
          <PlusCircle className="h-4 w-4 mr-2" />
          Create Admin
        </Button>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {admins && admins.length === 0 ? (
          <div id="empty-state" className="p-8 text-center">
            <UsersRound className="mx-auto h-12 w-12 text-neutral-400" />
            <h3 className="mt-2 text-sm font-medium text-neutral-900">No admin organizations</h3>
            <p className="mt-1 text-sm text-neutral-500">Get started by creating a new admin organization.</p>
            <div className="mt-6">
              <Button onClick={() => setCreateModalOpen(true)}>
                <PlusCircle className="h-4 w-4 mr-2" />
                Create Admin
              </Button>
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-neutral-200">
            {admins?.map((admin) => (
              <li key={admin.id} className="px-4 py-4 sm:px-6 flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-sm font-medium text-neutral-900">{admin.orgName}</h3>
                  <div className="mt-1 flex items-center">
                    <p className="text-sm text-neutral-500 mr-2">{admin.email}</p>
                    <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-100">
                      {admin.status === "active" ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-neutral-500">
                    Created on {typeof admin.createdAt === 'string' 
                      ? admin.createdAt 
                      : format(new Date(admin.createdAt), 'MMM d, yyyy')}
                  </p>
                </div>
                <div className="mt-4 sm:mt-0 flex items-center space-x-2">
                  <Button variant="ghost" size="icon" className="text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100">
                    <PencilIcon className="h-4 w-4" />
                    <span className="sr-only">Edit</span>
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-red-600 hover:text-red-900 hover:bg-red-50"
                    onClick={() => handleDeleteClick(admin)}
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Delete</span>
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <CreateAdminModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
      />

      <DeleteConfirmModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        adminId={selectedAdmin?.id || null}
        adminName={selectedAdmin?.orgName || null}
      />
    </div>
  );
}
