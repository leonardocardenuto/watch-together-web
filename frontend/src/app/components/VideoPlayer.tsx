import React, { useRef, useEffect, useState } from 'react';
import ReactPlayer from 'react-player';
import io, { Socket } from 'socket.io-client';

interface VideoPlayerProps {
  roomId: string;
  videoPath: string;
}
const API_DOMAIN = process.env.NEXT_PUBLIC_API_DOMAIN;
const socket: Socket =  io(API_DOMAIN);

const VideoPlayer: React.FC<VideoPlayerProps> = ({ roomId, videoPath }) => {
  const playerRef = useRef<ReactPlayer>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const lastEventSource = useRef<'local' | 'remote' | null>(null);

  useEffect(() => {
    console.log(`Joining room: ${roomId}`);
    socket.emit('join-room', { roomId });
  
    socket.on('sync', ({ currentTime, isPlaying, videoPath }) => {
      console.log(`Received sync event: currentTime=${currentTime}, isPlaying=${isPlaying}, videoPath=${videoPath}`);
      setCurrentTime(currentTime);
      setIsPlaying(isPlaying);
      playerRef.current?.seekTo(currentTime);
  
      if (!isPlaying) {
        playerRef.current?.seekTo(currentTime);
      }
    });
  
    socket.on('play', ({ currentTime }) => {
      console.log(`Received play event: currentTime=${currentTime}`);
      if (lastEventSource.current === 'remote') {
        lastEventSource.current = null;
        return;
      }
      lastEventSource.current = 'remote';
      setIsPlaying(true);
      setCurrentTime(currentTime);
      playerRef.current?.seekTo(currentTime);
    });
  
    socket.on('pause', ({ currentTime }) => {
      console.log(`Received pause event: currentTime=${currentTime}`);
      if (lastEventSource.current === 'remote') {
        lastEventSource.current = null;
        return;
      }
      lastEventSource.current = 'remote';
      setIsPlaying(false);
      if (currentTime) {
        setCurrentTime(currentTime);
        playerRef.current?.seekTo(currentTime);
      }
    });
  
    socket.on('seek', ({ currentTime }) => {
      console.log(`Received seek event: currentTime=${currentTime}`);
      if (lastEventSource.current === 'remote') {
        lastEventSource.current = null;
        return;
      }
      lastEventSource.current = 'remote';
      setCurrentTime(currentTime);
      playerRef.current?.seekTo(currentTime);
    });
  
    return () => {
      socket.off('sync');
      socket.off('play');
      socket.off('pause');
      socket.off('seek');
    };
  }, [roomId]);
  

  const handlePlay = () => {
    if (lastEventSource.current === 'remote') {
      lastEventSource.current = null;
      return;
    }
    const currentTime = playerRef.current?.getCurrentTime() || 0;
  
    if (isPlaying) {
      return; 
    }
  
    console.log(`Emitting play event: roomId=${roomId}, currentTime=${currentTime}`);
    setIsPlaying(true);
    socket.emit('play', { roomId, currentTime });
  };
  

  const handlePause = () => {
    if (lastEventSource.current === 'remote') {
      lastEventSource.current = null;
      return;
    }
    const currentTime = playerRef.current?.getCurrentTime() || 0;

    if (!isPlaying) {
      return; 
    }

    console.log(`Emitting pause event: roomId=${roomId}, currentTime=${currentTime}`);
    setIsPlaying(false);
    socket.emit('pause', { roomId, currentTime });
  };

  const handleSeek = (time: number) => {
    if (lastEventSource.current === 'remote') {
      lastEventSource.current = null;
      return;
    }

    if (Math.abs(time - currentTime) < 0.5) return;

    console.log(`Emitting seek event: roomId=${roomId}, currentTime=${time}`);
    setCurrentTime(time);
    socket.emit('seek', { roomId, currentTime: time });
  };

  return (
    <div>
      <ReactPlayer
        ref={playerRef}
        url={`${API_DOMAIN}${videoPath}`}
        playing={isPlaying}
        controls
        onPlay={handlePlay}
        onPause={handlePause}
        onSeek={handleSeek}
        progressInterval={1000}
      />
    </div>
  );
};

export default VideoPlayer;