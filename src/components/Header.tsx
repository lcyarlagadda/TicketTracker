// components/Header/Header.tsx
import React from 'react';
import { BookOpen, UserCircle, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { signOut } from '../store/slices/authSlice';

const Header: React.FC = () => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector(state => state.auth);
  const navigate = useNavigate();

  const handleLogout = () => {
    dispatch(signOut());
  };

  return (
    <header className="bg-gradient-to-r from-slate-50 via-white to-slate-50 border-b border-slate-200/60 shadow-lg backdrop-blur-sm px-4 py-3 flex items-center justify-between relative">
      <div className="absolute inset-0 bg-gradient-to-r from-blue-50/20 to-blue-60/20"></div>
      
      <div 
        className="flex items-center gap-3 cursor-pointer group relative z-10"  
        onClick={() => navigate('/boards')}
      >
        <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-105">
          <BookOpen size={24} className="text-white" />
        </div>
        <span className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-700 bg-clip-text text-transparent">
          Ticketracker
        </span>
      </div>

      {user && (
        <div className="flex items-center gap-4 relative z-10">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-slate-700">{user.displayName || user.email}</p>
            <p className="text-xs text-slate-500">{user.email}</p>
          </div>
          
          <div className="relative group">
            <div className="p-1 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 group-hover:from-blue-200 group-hover:to-purple-200 transition-all duration-300">
              <UserCircle size={40} className="text-slate-600" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white shadow-sm"></div>
          </div>
          
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-4 py-2 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95"
          >
            <LogOut size={16} />
            <span className="hidden sm:inline">Log Out</span>
          </button>
        </div>
      )}
    </header>
  );
};

export default Header;
