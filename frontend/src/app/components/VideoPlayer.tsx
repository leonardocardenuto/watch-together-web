import React, { useRef, useEffect, useState } from 'react';
import ReactPlayer from 'react-player';
import io, { Socket } from 'socket.io-client';

interface VideoPlayerProps {
  roomId: string;
  videoPath: string;
}

const API_DOMAIN = process.env.NEXT_PUBLIC_API_DOMAIN;
const socket: Socket = io(API_DOMAIN);

const VideoPlayer: React.FC<VideoPlayerProps> = ({ roomId, videoPath }) => {
  const playerRef = useRef<ReactPlayer>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const lastEventSource = useRef<'local' | 'remote' | null>(null);

  useEffect(() => {
    console.log(`Joining room: ${roomId}`);
    socket.emit('join-room', { roomId });

    socket.on('sync', ({ currentTime, isPlaying, videoPath }) => {
      setCurrentTime(currentTime);
      setIsPlaying(isPlaying);
      playerRef.current?.seekTo(currentTime);

      if (!isPlaying) {
        playerRef.current?.seekTo(currentTime);
      }
    });

    socket.on('play', ({ currentTime }) => {
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

    setIsPlaying(false);
    socket.emit('pause', { roomId, currentTime });
  };

  const handleSeek = (time: number) => {
    if (lastEventSource.current === 'remote') {
      lastEventSource.current = null;
      return;
    }

    if (Math.abs(time - currentTime) < 0.5) return;

    setCurrentTime(time);
    socket.emit('seek', { roomId, currentTime: time });
  };

  return (
    <div className="player-container">
      <ReactPlayer
        ref={playerRef}
        url={`${API_DOMAIN}${videoPath}`}
        playing={isPlaying}
        controls
        onPlay={handlePlay}
        onPause={handlePause}
        onSeek={handleSeek}
        progressInterval={1000}
        width="100%"
        height="100%"
      />
    </div>
  );
};

export default VideoPlayer;