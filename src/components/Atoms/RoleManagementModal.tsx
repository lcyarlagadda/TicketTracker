import React, { useState } from 'react';
import { X, Crown, UserCheck, User, Shield } from 'lucide-react';
import { Board, Collaborator, BoardRole } from '../../store/types/types';
import { getRoleDisplayName, getRoleDescription, canAssignRoleLegacy } from '../../utils/permissions';

interface RoleManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  board: Board;
  currentUserEmail: string;
  onUpdateRole: (collaboratorEmail: string, newRole: BoardRole) => void;
}

const RoleManagementModal: React.FC<RoleManagementModalProps> = ({
  isOpen,
  onClose,
  board,
  currentUserEmail,
  onUpdateRole,
}) => {
  const [selectedCollaborator, setSelectedCollaborator] = useState<Collaborator | null>(null);
  const [selectedRole, setSelectedRole] = useState<BoardRole>('user');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  if (!isOpen) return null;

  const handleRoleChange = (collaborator: Collaborator, newRole: BoardRole) => {
    console.log('Role change clicked:', { collaborator: collaborator.name, newRole, currentUserEmail });
    
    if (!canAssignRoleLegacy(board, currentUserEmail, newRole)) {
      console.log('Cannot assign role - permission denied');
      return;
    }

    // Don't allow changing the board creator's role
    if (collaborator.email === board.createdBy.email) {
      console.log('Cannot change board creator role');
      return;
    }

    console.log('Setting up confirmation dialog');
    setSelectedCollaborator(collaborator);
    setSelectedRole(newRole);
    setShowConfirmDialog(true);
  };

  const confirmRoleChange = () => {
    if (selectedCollaborator) {
      onUpdateRole(selectedCollaborator.email, selectedRole);
      setShowConfirmDialog(false);
      setSelectedCollaborator(null);
      
      // Show success message (you can replace this with a toast notification)
      console.log(`Successfully changed ${selectedCollaborator.name}'s role to ${getRoleDisplayName(selectedRole)}`);
    }
  };

  const getRoleIcon = (role: BoardRole) => {
    switch (role) {
      case 'admin':
        return <Crown size={16} className="text-yellow-600" />;
      case 'manager':
        return <UserCheck size={16} className="text-blue-600" />;
      case 'user':
        return <User size={16} className="text-gray-600" />;
    }
  };

  const getRoleColor = (role: BoardRole) => {
    switch (role) {
      case 'admin':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'manager':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'user':
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-300" 
        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, isolation: 'isolate' }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
      >
        <div 
          className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl relative z-[10001] animate-in zoom-in-95 duration-300"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                <Shield size={20} className="text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Role Management</h2>
                <p className="text-sm text-slate-600">Manage team member permissions</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X size={20} className="text-slate-500" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">

            <div className="space-y-4">
              {board.collaborators.map((collaborator) => (
                <div
                  key={collaborator.email}
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-sm">
                        {collaborator.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">{collaborator.name}</h3>
                      <p className="text-sm text-slate-600">{collaborator.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Current Role Badge */}
                    <div className={`flex items-center gap-2 px-3 py-1 rounded-full border text-sm font-medium ${getRoleColor(collaborator.role)}`}>
                      {getRoleIcon(collaborator.role)}
                      {getRoleDisplayName(collaborator.role)}
                    </div>

                    {/* Role Change Buttons */}
                    {canAssignRoleLegacy(board, currentUserEmail, 'admin') && (
                      <div className="flex gap-1">
                        {collaborator.email === board.createdBy.email ? (
                          <span className="px-3 py-1 text-xs font-medium text-slate-500 bg-slate-100 rounded-lg">
                            Board Creator
                          </span>
                        ) : (
                          (['admin', 'manager', 'user'] as BoardRole[]).map((role) => (
                            <button
                              key={role}
                              onClick={() => handleRoleChange(collaborator, role)}
                              disabled={collaborator.role === role || !canAssignRoleLegacy(board, currentUserEmail, role)}
                              className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
                                collaborator.role === role
                                  ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                                  : canAssignRoleLegacy(board, currentUserEmail, role)
                                  ? 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400 hover:shadow-sm cursor-pointer'
                                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                              }`}
                              title={
                                collaborator.role === role
                                  ? 'Current role'
                                  : canAssignRoleLegacy(board, currentUserEmail, role)
                                  ? `Change to ${getRoleDisplayName(role)}`
                                  : 'No permission to assign this role'
                              }
                            >
                              {getRoleDisplayName(role)}
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Role Statistics */}
            <div className="mt-8 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <Shield size={16} />
                Role Distribution
              </h3>
              <div className="grid grid-cols-3 gap-4">
                {(['admin', 'manager', 'user'] as BoardRole[]).map((role) => {
                  const count = board.collaborators.filter(c => c.role === role).length;
                  const isCreator = board.collaborators.filter(c => c.role === role && c.email === board.createdBy.email).length;
                  return (
                    <div key={role} className="text-center">
                      <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${getRoleColor(role)}`}>
                        {getRoleIcon(role)}
                        {getRoleDisplayName(role)}
                      </div>
                      <p className="text-xs text-slate-600 mt-1">
                        {count} {count === 1 ? 'member' : 'members'}
                        {isCreator > 0 && ' (includes creator)'}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 p-6 border-t border-slate-200">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition-all duration-200"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && selectedCollaborator && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[10000] flex items-center justify-center p-4 animate-in fade-in duration-300" 
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, isolation: 'isolate' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowConfirmDialog(false);
            }
          }}
        >
          <div 
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative z-[10002] animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Shield size={24} className="text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Change Role</h3>
                <p className="text-slate-600 text-sm">This will update the user's permissions</p>
              </div>
            </div>

            <div className="mb-6">
              <p className="text-slate-700 mb-4 leading-relaxed">
                Are you sure you want to change <span className="font-semibold">{selectedCollaborator.name}</span>'s role from{' '}
                <span className="font-semibold">{getRoleDisplayName(selectedCollaborator.role)}</span> to{' '}
                <span className="font-semibold">{getRoleDisplayName(selectedRole)}</span>?
              </p>
              
              <div className="space-y-3">
                <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                  <p className="text-sm text-red-700">
                    <span className="font-medium">Current permissions:</span> {getRoleDescription(selectedCollaborator.role)}
                  </p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-sm text-green-700">
                    <span className="font-medium">New permissions:</span> {getRoleDescription(selectedRole)}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowConfirmDialog(false)}
                className="px-4 py-2 border-2 border-slate-300 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition-all duration-200"
              >
                Cancel
              </button>
              <button
                onClick={confirmRoleChange}
                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-medium hover:from-blue-600 hover:to-blue-700 transition-all duration-200 hover:scale-105 shadow-lg hover:shadow-xl"
              >
                Confirm Change
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default RoleManagementModal;
