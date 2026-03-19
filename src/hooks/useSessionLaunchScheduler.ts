import { useEffect } from 'react';
import { useProjectStore } from '../store/projectStore';
import { useTransportStore } from '../store/transportStore';

export function useSessionLaunchScheduler() {
  const currentTime = useTransportStore((state) => state.currentTime);
  const commitPendingSessionLaunches = useProjectStore((state) => state.commitPendingSessionLaunches);

  useEffect(() => {
    commitPendingSessionLaunches(currentTime);
  }, [commitPendingSessionLaunches, currentTime]);
}
