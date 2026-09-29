'use client';
import { Award, Briefcase, Plus, User, Users, Wrench } from 'lucide-react';
import type React from 'react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useProject } from '@/context/ProjectContext';
import { useAssignableUsers } from '../../assign_task/server/tanstackQuery/useUsersQueries';

interface TeamMember {
  id: string;
  name: string;
  image: string;
  department: string;
  experience: string;
  skills: string[];
}

function MemberAvatar({
  name,
  image,
  size = 'md',
}: {
  name: string;
  image?: string;
  size?: 'md' | 'lg';
}) {
  const [hasError, setHasError] = useState(false);
  const sizeClasses = size === 'lg' ? 'w-14 h-14' : 'w-12 h-12';
  const iconSize = size === 'lg' ? 'w-7 h-7' : 'w-6 h-6';

  if (image && image.trim() && !hasError) {
    return (
      <img
        src={image}
        alt={name}
        onError={() => setHasError(true)}
        className={`${sizeClasses} rounded-full object-cover border-2 border-sky-100 dark:border-sky-900/50 shadow-xs shrink-0`}
      />
    );
  }

  return (
    <div
      className={`${sizeClasses} rounded-full bg-sky-100/90 dark:bg-sky-950/70 border-2 border-sky-200 dark:border-sky-800 flex items-center justify-center text-sky-600 dark:text-sky-400 shadow-xs shrink-0`}
      title={name}
    >
      <User className={iconSize} />
    </div>
  );
}

const initialMembers: TeamMember[] = [
  {
    id: '1',
    name: 'Rajesh Kumar',
    image: '',
    department: 'Electrical Maintenance',
    experience: 'Staff',
    skills: ['Electrical Systems', 'Troubleshooting'],
  },
];

const initialForm = { name: '', image: '', department: '', experience: '', skills: '' };

export default function TeamReportPage() {
  const { selectedProject } = useProject();
  const queryFirmId = selectedProject ? String(selectedProject.id) : undefined;
  const { data: realUsers } = useAssignableUsers(queryFirmId);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(initialMembers);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState(initialForm);

  useEffect(() => {
    if (realUsers && realUsers.length > 0) {
      const dynamicMembers: TeamMember[] = realUsers.map((u) => ({
        id: u.id,
        name: u.name || 'Technician',
        image: '',
        department: u.role || 'Maintenance',
        experience: u.employeeId ? `ID: ${u.employeeId}` : 'Active Staff',
        skills: ['Maintenance', 'Inspection', 'Troubleshooting'],
      }));
      setTeamMembers(dynamicMembers);
    }
  }, [realUsers]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Please enter a team member name');
      return;
    }
    const newMember: TeamMember = {
      id: (teamMembers.length + 1).toString(),
      name: formData.name.trim(),
      image: formData.image.trim() || '',
      department: formData.department.trim() || 'General Maintenance',
      experience: formData.experience.trim() || 'Staff',
      skills: formData.skills
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    };
    setTeamMembers([...teamMembers, newMember]);
    setFormData(initialForm);
    setIsModalOpen(false);
    toast.success('Team member added successfully');
  };

  return (
    <div className="bg-transparent">
      <div className="space-y-4 md:space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg md:rounded-xl shadow-lg border border-gray-200 p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="w-6 h-6 md:w-8 md:h-8 text-sky-600" />
              <div>
                <h1 className="text-lg md:text-xl font-bold text-gray-900">
                  Maintenance Team Report
                </h1>
                <p className="text-xs text-gray-500 mt-1">Team members and their expertise</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-sky-50 dark:bg-sky-950/40 px-3.5 py-1.5 rounded-lg border border-sky-200 dark:border-sky-800">
                <Users className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                <span className="text-sm font-bold text-sky-600 dark:text-sky-400">{teamMembers.length}</span>
              </div>
              <Button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white font-medium rounded-lg shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Add Member</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg md:rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="p-4 md:p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <Wrench className="w-5 h-5 md:w-6 md:h-6 text-sky-600" />
              <h2 className="text-base md:text-lg font-bold text-gray-900">
                Team Performance Details
              </h2>
            </div>
          </div>

          {/* Desktop Table */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Team Member
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Department
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Work Experience
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Skills
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {teamMembers.map((member) => (
                  <tr key={member.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <MemberAvatar name={member.name} image={member.image} />
                        <div>
                          <p className="font-semibold text-gray-900">{member.name}</p>
                          <p className="text-xs text-gray-500">Maintenance Technician</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-sky-500" />
                        <span className="text-gray-900 font-medium">{member.department}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Award className="w-4 h-4 text-amber-500" />
                        <span className="text-gray-900 font-semibold">{member.experience}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-2">
                        {member.skills.map((skill, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-sky-50 text-sky-700 border border-sky-200"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden space-y-4 p-4">
            {teamMembers.map((member) => (
              <div
                key={member.id}
                className="bg-gray-50 rounded-lg p-4 space-y-4 border border-gray-200"
              >
                <div className="flex items-center gap-3 pb-3 border-b border-gray-200">
                  <MemberAvatar name={member.name} image={member.image} size="lg" />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 text-sm truncate">{member.name}</p>
                    <p className="text-xs text-gray-500">Maintenance Technician</p>
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Briefcase className="w-4 h-4 text-sky-500" />
                    <span className="text-xs text-gray-500 font-medium">Department</span>
                  </div>
                  <p className="text-xs font-semibold text-gray-900 ml-6">{member.department}</p>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Award className="w-4 h-4 text-amber-500" />
                    <span className="text-xs text-gray-500 font-medium">Work Experience</span>
                  </div>
                  <p className="text-xs font-semibold text-gray-900 ml-6">{member.experience}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium mb-2">Skills</p>
                  <div className="flex flex-wrap gap-2">
                    {member.skills.map((skill, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-sky-50 text-sky-700 border border-sky-200"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Modal using system Dialog */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-md max-h-[90vh] overflow-y-auto p-0 gap-0 border-border">
            <DialogHeader className="p-6 border-b border-border text-left">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 shrink-0">
                  <Users size={20} />
                </div>
                <div className="space-y-0.5">
                  <DialogTitle className="text-lg font-bold text-foreground leading-snug">
                    Add Team Member
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    Add a technician or staff member to the maintenance team roster.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <form onSubmit={handleSubmit}>
              <div className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="tm-name" className="text-xs font-semibold text-foreground">
                    Full Name *
                  </Label>
                  <Input
                    id="tm-name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    placeholder="Enter full name"
                    className="border-border"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="tm-image" className="text-xs font-semibold text-foreground">
                    Profile Image URL
                  </Label>
                  <Input
                    id="tm-image"
                    name="image"
                    value={formData.image}
                    onChange={handleChange}
                    placeholder="https://... (optional)"
                    className="border-border"
                  />
                  <p className="text-[11px] text-muted-foreground">Leave empty for default icon</p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="tm-dept" className="text-xs font-semibold text-foreground">
                    Department *
                  </Label>
                  <Input
                    id="tm-dept"
                    name="department"
                    value={formData.department}
                    onChange={handleChange}
                    required
                    placeholder="e.g., Electrical Maintenance"
                    className="border-border"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="tm-exp" className="text-xs font-semibold text-foreground">
                    Work Experience *
                  </Label>
                  <Input
                    id="tm-exp"
                    name="experience"
                    value={formData.experience}
                    onChange={handleChange}
                    required
                    placeholder="e.g., 5 years"
                    className="border-border"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="tm-skills" className="text-xs font-semibold text-foreground">
                    Skills *
                  </Label>
                  <Input
                    id="tm-skills"
                    name="skills"
                    value={formData.skills}
                    onChange={handleChange}
                    required
                    placeholder="Separate skills with commas"
                    className="border-border"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Example: Electrical Systems, PLC Programming
                  </p>
                </div>
              </div>

              <DialogFooter className="p-4 sm:p-6 border-t border-border bg-muted/20 flex flex-row items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-sky-600 hover:bg-sky-700 text-white font-medium shadow-xs"
                >
                  Add Member
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
