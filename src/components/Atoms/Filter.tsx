import React from "react";
import { Search, Filter, UserCheck, Tag, Zap } from "lucide-react";

interface FilterSectionProps {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  showFilters: boolean;
  setShowFilters: (value: boolean) => void;
  selectedAssignees: string[];
  setSelectedAssignees: (value: string[]) => void;
  selectedTags: string[];
  setSelectedTags: (value: string[]) => void;
  selectedSprints: string[];
  setSelectedSprints: (value: string[]) => void;
  uniqueAssignees: string[];
  uniqueTags: string[];
  uniqueSprints: string[];
  hasActiveFilters: boolean;
  clearFilters: () => void;
}

const FilterSection: React.FC<FilterSectionProps> = ({
  searchTerm,
  setSearchTerm,
  showFilters,
  setShowFilters,
  selectedAssignees,
  setSelectedAssignees,
  selectedTags,
  setSelectedTags,
  selectedSprints,
  setSelectedSprints,
  uniqueAssignees,
  uniqueTags,
  uniqueSprints,
  hasActiveFilters,
  clearFilters,
}) => {
  return (
    <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-slate-200/60 shadow-lg p-4 mb-4">
      <div className="flex flex-col gap-4">
        {/* Search Bar and Filter Toggle */}
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search tasks by title, description, or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border-2 border-slate-200 rounded-xl text-sm focus:border-blue-500 focus:outline-none transition-colors"
            />
          </div>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-2 rounded-xl font-medium text-sm transition-colors flex items-center gap-2 ${
              showFilters || hasActiveFilters
                ? "bg-blue-600 text-white"
                : "bg-slate-200 text-slate-600 hover:bg-slate-300"
            }`}
          >
            <Filter size={16} />
            Filters
            {hasActiveFilters && (
              <span className="bg-white text-blue-600 text-xs px-2 py-1 rounded-full font-bold">
                {(searchTerm ? 1 : 0) + selectedAssignees.length + selectedTags.length + selectedSprints.length}
              </span>
            )}
          </button>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="px-4 py-2 bg-red-100 text-red-600 rounded-xl font-medium text-sm hover:bg-red-200 transition-colors"
            >
              Clear
            </button>
          )}
        </div>

        {/* Filter Controls */}
        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-200">
            {/* Assignee Filter */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                <UserCheck size={16} />
                Assigned To
              </label>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {uniqueAssignees.map(assignee => (
                  <label key={assignee} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedAssignees.includes(assignee)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedAssignees([...selectedAssignees, assignee]);
                        } else {
                          setSelectedAssignees(selectedAssignees.filter(a => a !== assignee));
                        }
                      }}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-slate-600">{assignee}</span>
                  </label>
                ))}
                {uniqueAssignees.length === 0 && (
                  <p className="text-sm text-slate-400">No assigned tasks yet</p>
                )}
              </div>
            </div>

            {/* Tags Filter */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                <Tag size={16} />
                Tags
              </label>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {uniqueTags.map(tag => (
                  <label key={tag} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedTags.includes(tag)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedTags([...selectedTags, tag]);
                        } else {
                          setSelectedTags(selectedTags.filter(t => t !== tag));
                        }
                      }}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-slate-600 px-2 py-1 bg-slate-100 rounded-lg text-xs">
                      {tag}
                    </span>
                  </label>
                ))}
                {uniqueTags.length === 0 && (
                  <p className="text-sm text-slate-400">No tags found</p>
                )}
              </div>
            </div>

            {/* Sprint Filter */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                <Zap size={16} />
                Sprint
              </label>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {uniqueSprints.map(sprint => (
                  <label key={sprint} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedSprints.includes(sprint)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedSprints([...selectedSprints, sprint]);
                        } else {
                          setSelectedSprints(selectedSprints.filter(s => s !== sprint));
                        }
                      }}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className={`text-slate-600 px-2 py-1 rounded-lg text-xs`}>
                      {sprint === 'Backlog' ? 'Backlog' : `${sprint}`}
                    </span>
                  </label>
                ))}
                {uniqueSprints.length === 0 && (
                  <p className="text-sm text-slate-400">No sprints found</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FilterSection;