'use client';
import React, { useState, useEffect } from 'react';
import socket from '@/app/utils/socket';
import VideoPlayer from '@/app/components/VideoPlayer';

interface RoomViewProps {
  roomId: string;
  isRoomCreator: boolean;
  onLeaveRoom: () => void;
}

const RoomView: React.FC<RoomViewProps> = ({ roomId, isRoomCreator, onLeaveRoom }) => {
  const [videoPath, setVideoPath] = useState<string>('');
  const [isSynced, setIsSynced] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('video', e.target.files[0]);
    formData.append('roomId', roomId);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_DOMAIN}/upload`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      setVideoPath(data.videoPath);
      socket.emit('video-uploaded', { roomId, videoPath: data.videoPath });
    } catch (error) {
      console.error('Error uploading video:', error);
    } finally {
      setIsUploading(false);
    }
  };

  useEffect(() => {
    socket.on('sync', ({ videoPath }: { videoPath: string }) => {
      setVideoPath(videoPath);
    });

    socket.on('video-updated', ({ videoPath }: { videoPath: string }) => {
      setVideoPath(videoPath);
    });

    socket.on('sync-complete', () => {
      setIsSynced(true);
    });

    return () => {
      socket.off('sync');
      socket.off('video-updated');
      socket.off('sync-complete');
    };
  }, []);

  return (
    <div>
      <div className="absolute top-4 right-4 text-white text-xl z-10">
        <p className="mb-2">Room ID: {roomId}</p>
        <button className="btn-secondary" onClick={onLeaveRoom}>
          Leave Room
        </button>
      </div>

      {(isRoomCreator || isSynced) && (
        <div className="mt-6 mb-4 flex flex-col items-center">
          <input
            type="file"
            accept="video/*"
            onChange={handleVideoUpload}
            className="input w-full max-w-md"
            disabled={isUploading}
          />
          {isUploading && (
            <div className="flex flex-col items-center mt-4 mb-4">
              <div className="loader mb-2"></div>
              <p>Uploading video, please wait...</p>
            </div>
          )}
        </div>
      )}


      {videoPath && (
        <div className="video-container mt-4">
          <VideoPlayer roomId={roomId} videoPath={videoPath} isRoomCreator={isRoomCreator} />
        </div>
      )}
    </div>
  );
};

export default RoomView;