import React, { useEffect, useRef } from 'react';
import { useAppSelector } from '../../store/store';
import { useGetTaskAssignmentOptionsQuery } from '../../features/tasks/services/taskApi';
import { clearReportingAssignableStorageFor } from '../storage/reportingUsersStorage';

/**
 * Warms `/tasks/assignment-options` after login; clears persisted assignee list
 * after sign-out (so the next account does not inherit the previous roster).
 */
const ReportingUsersSessionBootstrap: React.FC = () => {
  const authed = useAppSelector((s) => s.auth.isAuthenticated);
  const userId = useAppSelector((s) => s.auth.user?.userId) ?? '';
  const prevAuthed = useRef(authed);
  const lastSeenUser = useRef<string>('');

  useEffect(() => {
    if (userId) lastSeenUser.current = userId;
  }, [userId]);

  useGetTaskAssignmentOptionsQuery(undefined, { skip: !authed });

  useEffect(() => {
    if (prevAuthed.current && !authed) {
      const u = lastSeenUser.current;
      if (u) clearReportingAssignableStorageFor(u);
      lastSeenUser.current = '';
    }
    prevAuthed.current = authed;
  }, [authed]);

  return null;
};

export default ReportingUsersSessionBootstrap;
