'use client';
import React, { useState } from 'react';
import socket from '@/app/utils/socket';

interface HomeViewProps {
  onRoomJoined: (roomId: string, isRoomCreator: boolean) => void;
}

const HomeView: React.FC<HomeViewProps> = ({ onRoomJoined }) => {
  const [inputRoomId, setInputRoomId] = useState<string>('');

  const handleCreateRoom = async () => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_DOMAIN}/create-room`, { method: 'POST' });
    const data = await res.json();
    onRoomJoined(data.roomId, true);
  };

  const handleJoinRoom = () => {
    if (!inputRoomId) {
      alert('Please enter a valid room ID');
      return;
    }
    socket.emit('join-room', { roomId: inputRoomId, isRoomCreator: false });
    onRoomJoined(inputRoomId, false);
  };

  return (
    <div className="card w-full max-w-xl p-6">
      <button className="btn w-full" onClick={handleCreateRoom}>
        Create Room
      </button>
      <div className="mt-6">
        <input
          type="text"
          placeholder="Enter Room ID"
          value={inputRoomId}
          onChange={(e) => setInputRoomId(e.target.value)}
          className="input text-black w-full"
        />
        <button className="btn mt-4 w-full" onClick={handleJoinRoom}>
          Join Room
        </button>
      </div>
    </div>
  );
};

export default HomeView;