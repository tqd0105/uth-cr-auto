'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  BookOpen, 
  ChevronRight, 
  Clock,
  AlertCircle,
  Loader2,
  CheckSquare,
  Square,
  Users
} from 'lucide-react';
import type { HocPhan, LopHocPhan, DangKyHocPhan } from '@/lib/types/uth';
import { ClassModal } from './ClassModalV2';
import { BulkRegistrationManager } from './BulkRegistrationManager';
import { useProStatus } from '@/hooks/useProStatus';

interface CourseListProps {
  courses: HocPhan[];
  registeredCourses?: DangKyHocPhan[];
  onRefresh: () => void;
  bulkMode: boolean;
  selectedCourses?: Set<number>;
  setSelectedCourses?: (courses: Set<number>) => void;
}

export function CourseList({ courses, registeredCourses = [], onRefresh, bulkMode, selectedCourses = new Set(), setSelectedCourses }: CourseListProps) {
  const [selectedCourse, setSelectedCourse] = useState<HocPhan | null>(null);
  const [classSections, setClassSections] = useState<LopHocPhan[]>([]);
  const [isLoadingClasses, setIsLoadingClasses] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const { isPro } = useProStatus();

  const handleSelectCourse = async (course: HocPhan) => {
    setSelectedCourse(course);
    setIsLoadingClasses(true);
    setShowModal(true);

    try {
      const response = await fetch(
        `/api/courses/classes?idDot=75&maHocPhan=${course.maHocPhan}`
      );
      const data = await response.json();

      if (data.success) {
        setClassSections(data.data || []);
      } else {
        setClassSections([]);
      }
    } catch (error) {
      console.error('Error loading classes:', error);
      setClassSections([]);
    } finally {
      setIsLoadingClasses(false);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedCourse(null);
    setClassSections([]);
  };

  const toggleCourseSelection = (courseId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!setSelectedCourses) return;
    
    const newSelected = new Set(selectedCourses);
    if (newSelected.has(courseId)) {
      newSelected.delete(courseId);
    } else {
      newSelected.add(courseId);
    }
    setSelectedCourses(newSelected);
  };

  const handleCardClick = (course: HocPhan, e: React.MouseEvent) => {
    if (bulkMode) {
      // In bulk mode, toggle selection
      toggleCourseSelection(course.id, e);
    } else {
      // Normal mode, open modal
      handleSelectCourse(course);
    }
  };

  if (courses.length === 0) {
    return (
      <Card className={isPro ? 'pro-card border-0' : ''}>
        <CardContent className="p-8 text-center">
          <AlertCircle className={`w-12 h-12 mx-auto mb-4 ${isPro ? 'text-gray-500' : 'text-gray-400'}`} />
          <p className={isPro ? 'text-gray-400' : 'text-gray-500'}>Không có môn học nào có thể đăng ký</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
        {courses.map((course) => (
          <Card 
            key={course.id} 
            className={`shadow-sm hover:shadow-md transition-all cursor-pointer ${
              bulkMode && selectedCourses.has(course.id) 
                ? isPro 
                  ? 'border border-green-500/50 bg-green-900/20' 
                  : 'border border-green-500 bg-green-50' 
                : isPro 
                  ? 'pro-card border-0 hover:border-yellow-400/30' 
                  : 'border border-gray-200 hover:border-gray-300'
            }`}
            onClick={(e) => handleCardClick(course, e)}
          >
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                  {bulkMode && (
                    <div onClick={(e) => toggleCourseSelection(course.id, e)} className="flex-shrink-0">
                      {selectedCourses.has(course.id) ? (
                        <CheckSquare className={`w-5 h-5 ${isPro ? 'text-green-400' : 'text-green-600'}`} />
                      ) : (
                        <Square className={`w-5 h-5 ${isPro ? 'text-gray-500' : 'text-gray-400'}`} />
                      )}
                    </div>
                  )}
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                    isPro ? 'bg-gradient-to-br from-blue-600/30 to-cyan-500/30' : 'bg-gray-100'
                  }`}>
                    <img src="circle.png" className="w-6 h-6 sm:w-8 sm:h-8" alt="" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className={`font-medium text-sm sm:text-base truncate ${
                      isPro ? 'text-gray-100' : 'text-gray-900'
                    }`}>
                      {course.tenHocPhan}
                    </h3>
                    <div className={`flex flex-wrap items-center gap-x-2 sm:gap-x-4 gap-y-0.5 text-xs sm:text-sm mt-0.5 ${
                      isPro ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      <span className="truncate">Mã: {course.maHocPhan}</span>
                      <span className="flex items-center gap-1 flex-shrink-0">
                        <Clock className="w-3 h-3" />
                        {course.soTinChi} TC
                      </span>
                    </div>
                    {course.tenHocPhanTruoc && (
                      <div className={`mt-1 text-xs truncate ${
                        isPro ? 'text-orange-400' : 'text-orange-600'
                      }`}>
                        ⚠️ HP trước: {course.tenHocPhanTruoc}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                  {course.isBatBuoc && (
                    <span className={`px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs rounded ${
                      isPro ? 'bg-red-900/50 text-red-300' : 'bg-red-100 text-red-700'
                    }`}>
                      Bắt buộc
                    </span>
                  )}
                  <ChevronRight className={`w-4 h-4 sm:w-5 sm:h-5 ${
                    isPro ? 'text-yellow-400/70' : 'text-gray-400'
                  }`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Class Selection Modal */}
      {showModal && selectedCourse && (
        <ClassModal
          course={selectedCourse}
          classes={classSections}
          registeredCourses={registeredCourses}
          isLoading={isLoadingClasses}
          onClose={handleCloseModal}
          onSuccess={() => {
            handleCloseModal();
            onRefresh();
          }}
        />
      )}
    </>
  );
}