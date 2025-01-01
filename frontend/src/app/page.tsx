"use client";
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

  const handleCreateRoom = async () => {
    const res = await fetch(`${API_DOMAIN}/create-room`, { method: 'POST' });
    const data = await res.json();
    setRoomId(data.roomId);
    setIsInRoom(true);
  };

  const handleJoinRoom = async () => {
    if (!inputRoomId) {
      alert('Please enter a valid room ID');
      return;
    }

    socket.emit('join-room', { roomId: inputRoomId });
    setRoomId(inputRoomId);
    setIsInRoom(true);
  };

  // Handle video upload
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
    setIsInRoom(false);
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

    return () => {
      socket.off('sync');
      socket.off('video-updated');
      socket.off('user-left');
    };
  }, []);

  return (
    <div>
      <h1>Video Sync App</h1>

      {/* Room Creation or Join */}
      {!roomId ? (
        <div>
          <button onClick={handleCreateRoom}>Create Room</button>

          {/* Join Room Section */}
          <div>
            <input
              type="text"
              placeholder="Enter Room ID"
              value={inputRoomId}
              onChange={(e) => setInputRoomId(e.target.value)}
            />
            <button onClick={handleJoinRoom}>Join Room</button>
          </div>
        </div>
      ) : (
        <div>
          <p>Room ID: {roomId}</p>
          <button onClick={handleLeaveRoom}>Leave Room</button>
        </div>
      )}

      <div>
        <input type="file" accept="video/*" onChange={handleVideoUpload} />
        {videoUploaded && (
          <p>
            Video uploaded: {videoPath.split('/').pop()}
            <button onClick={() => setVideoUploaded(false)}>Replace Video</button>
          </p>
        )}
      </div>

      {videoPath && <VideoPlayer roomId={roomId} videoPath={videoPath} />}
    </div>
  );
};

export default Home;