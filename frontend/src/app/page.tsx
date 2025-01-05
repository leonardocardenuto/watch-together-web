'use client';
import React, { useState } from 'react';
import HomeView from '@/app/components/HomeView';
import RoomView from '@/app/components/RoomView';
import socket from '@/app/utils/socket';

const Home: React.FC = () => {
  const [roomId, setRoomId] = useState<string>('');
  const [isRoomCreator, setIsRoomCreator] = useState<boolean>(false);

  const handleRoomJoined = (roomId: string, isRoomCreator: boolean) => {
    setRoomId(roomId);
    setIsRoomCreator(isRoomCreator);
  };

  const handleLeaveRoom = () => {
    socket.emit('leave-room', { roomId });
    setRoomId('');
    setIsRoomCreator(false);
  };

  return (
    <div className="relative container">
      <h1 className="absolute top-4 left-4 text-white text-2xl font-bold z-10">Watch 2gether</h1>

      {!roomId ? (
        <div className="flex justify-center items-center mt-20">
          <HomeView onRoomJoined={handleRoomJoined} />
        </div>
      ) : (
        <RoomView roomId={roomId} isRoomCreator={isRoomCreator} onLeaveRoom={handleLeaveRoom} />
      )}
    </div>
  );
};

export default Home;
