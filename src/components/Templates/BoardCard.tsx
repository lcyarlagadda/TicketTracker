// components/Templates/BoardCard.tsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Trash2,
  Calendar,
  User,
  BookOpen,
  MessageSquare,
  BarChart3,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../hooks/redux";
import { deleteBoard } from "../../store/slices/boardSlice";
import { Board } from "../../store/types/types";
import ConfirmModal from "../Atoms/ConfirmModal";
import { hasPermissionLegacy } from "../../utils/permissions";

interface BoardCardProps {
  board: Board;
}

const BoardCard: React.FC<BoardCardProps> = ({ board }) => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const navigate = useNavigate();
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDelete = async () => {
    if (!user) return;

    try {
      await dispatch(
        deleteBoard({ userId: user.uid, boardId: board.id })
      ).unwrap();
    } catch (err) {
      // Error("Failed to delete board:", err);
    } finally {
      setShowConfirm(false);
    }
  };

  const categoryColors: Record<string, string> = {
    Work: "from-blue-500 to-blue-600",
    Personal: "from-green-500 to-green-600",
    Project: "from-purple-500 to-blue-600",
    Team: "from-orange-500 to-orange-600",
    Study: "from-indigo-500 to-indigo-600",
    Sports: "from-red-500 to-red-600",
    Career: "from-emerald-500 to-emerald-600",
    default: "from-slate-500 to-slate-600",
  };

  const gradientClass =
    categoryColors[board.category] || categoryColors.default;

  return (
    <>
      <div
        onClick={() => navigate(`/board/${board.id}`)}
        className="group relative bg-white rounded-2xl border border-slate-200/60 shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] cursor-pointer overflow-hidden"
      >
        <div
          className={`absolute inset-0 bg-gradient-to-br ${gradientClass} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}
        ></div>
        <div className={`h-2 bg-gradient-to-r ${gradientClass}`}></div>

        <div className="relative p-6">
          <div className="flex justify-between items-start mb-4">
            <h4 className="font-bold text-xl text-slate-800 group-hover:text-slate-900 transition-colors">
              {board.title}
            </h4>
            <div className="flex gap-3 items-center">
              <div
                className={`px-3 py-1 rounded-full bg-gradient-to-r ${gradientClass} text-white text-xs font-semibold shadow-md`}
              >
                {board.category}
              </div>
              {user && hasPermissionLegacy(board, user.email || '', 'canDeleteBoard') && (
                <button
                  className="p-2 rounded-full bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-600 transition-all duration-200 opacity-0 group-hover:opacity-100 hover:scale-110"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowConfirm(true);
                  }}
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          </div>

          {board.description && (
            <p className="text-sm text-slate-600 mb-4 leading-relaxed">
              {board.description.length > 80
                ? `${board.description.slice(0, 80)}...`
                : board.description}
            </p>
          )}

          <div className="flex items-center gap-2 mb-4 text-slate-500">
            <User size={14} />
            <p className="text-xs font-medium">
              Created by {board.createdBy.name}
            </p>
          </div>

          {board.tags?.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {board.tags.slice(0, 3).map((tag, idx) => (
                <span
                  key={idx}
                  className="text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-full px-3 py-1 transition-colors"
                >
                  #{tag}
                </span>
              ))}
              {board.tags.length > 3 && (
                <span className="text-xs font-medium text-slate-500 bg-slate-50 rounded-full px-3 py-1">
                  +{board.tags.length - 3} more
                </span>
              )}
            </div>
          )}

        </div>
      </div>

      {showConfirm && (
        <ConfirmModal
          message={`Delete board "${board.title}" and all its tasks?`}
          onConfirm={handleDelete}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </>
  );
};

export default BoardCard;
