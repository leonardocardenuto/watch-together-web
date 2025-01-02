'use client';
import React, { useState, useEffect } from 'react';
import VideoPlayer from '@/app/components/VideoPlayer';
import io from 'socket.io-client';

const API_DOMAIN = process.env.NEXT_PUBLIC_API_DOMAIN;
const socket = io(API_DOMAIN);

const Home: React.FC = () => {
  const [roomId, setRoomId] = useState<string>('');
  const [videoPath, setVideoPath] = useState<string>('');
  const [inputRoomId, setInputRoomId] = useState<string>('');
  const [videoUploaded, setVideoUploaded] = useState<boolean>(false);
  const [isRoomCreator, setIsRoomCreator] = useState<boolean>(false);
  const [isSynced, setIsSynced] = useState<boolean>(false); 

  const handleCreateRoom = async () => {
    const res = await fetch(`${API_DOMAIN}/create-room`, { method: 'POST' });
    const data = await res.json();
    setRoomId(data.roomId);
    setIsRoomCreator(true); 
  };

  const handleJoinRoom = async () => {
    if (!inputRoomId) {
      alert('Please enter a valid room ID');
      return;
    }

    socket.emit('join-room', { roomId: inputRoomId, isRoomCreator: false });
    setRoomId(inputRoomId);
    setIsRoomCreator(false); 
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const formData = new FormData();
    formData.append('video', e.target.files[0]);
    formData.append('roomId', roomId);

    const res = await fetch(`${API_DOMAIN}/upload`, {
      method: 'POST',
      body: formData,
    });
    const data = await res.json();
    setVideoPath(data.videoPath);
    setVideoUploaded(true);

    socket.emit('video-uploaded', { roomId, videoPath: data.videoPath });
  };

  const handleLeaveRoom = () => {
    socket.emit('leave-room', { roomId });
    setRoomId('');
    setVideoPath('');
    setIsRoomCreator(false);
    setIsSynced(false);
  };

  useEffect(() => {
    socket.on('sync', ({ currentTime, isPlaying, videoPath }: { currentTime: number; isPlaying: boolean; videoPath: string }) => {
      setVideoPath(videoPath);
    });

    socket.on('video-updated', ({ videoPath }: { videoPath: string }) => {
      console.log('Received video-updated event: new videoPath=', videoPath);
      setVideoPath(videoPath);
    });

    socket.on('user-left', ({ socketId }) => {
      console.log(`User ${socketId} has left the room`);
    });

    socket.on('sync-complete', () => {
      setIsSynced(true); 
    });

    socket.on('new-user-joined', ({ isRoomCreator }: { isRoomCreator: boolean }) => {
      if (!isRoomCreator) {
        alert('A new user has joined the room!');
      }
    });

    return () => {
      socket.off('sync');
      socket.off('video-updated');
      socket.off('user-left');
      socket.off('sync-complete');
      socket.off('new-user-joined');
    };
  }, []);

  return (
    <div className="relative container">
      <h1 className="absolute top-4 left-4 text-white text-2xl font-bold z-10">Watch 2gether</h1>

      <div className="flex justify-center items-center mt-20">
        {!roomId ? (
          <div className="card w-full max-w-xl p-6">
            <button className="btn w-full" onClick={handleCreateRoom}>Create Room</button>
            <div className="mt-6">
              <input
                type="text"
                placeholder="Enter Room ID"
                value={inputRoomId}
                onChange={(e) => setInputRoomId(e.target.value)}
                className="input text-black w-full"
              />
              <button className="btn mt-4 w-full" onClick={handleJoinRoom}>Join Room</button>
            </div>
          </div>
        ) : (
          <div className="absolute top-4 right-4 text-white text-xl z-10">
            <p className="mb-2">Room ID: {roomId}</p>
            <button className="btn-secondary" onClick={handleLeaveRoom}>Leave Room</button>
          </div>
        )}
      </div>

      {(roomId && isRoomCreator) || (roomId && isSynced) ? (
        <div className="mt-6 mb-4 flex justify-center">
          <input
            type="file"
            accept="video/*"
            onChange={handleVideoUpload}
            className="input w-full max-w-md"
          />
        </div>
      ) : null}

      {videoPath && (
        <div className="video-container mt-4">
          <VideoPlayer roomId={roomId} videoPath={videoPath} isRoomCreator={isRoomCreator} />
        </div>
      )}
    </div>
  );
};

export default Home;