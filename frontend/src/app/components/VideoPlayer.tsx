import React, { useRef, useEffect, useState } from 'react';
import ReactPlayer from 'react-player';
import { FaPlay, FaPause, FaExpand, FaCompress } from 'react-icons/fa';
import io, { Socket } from 'socket.io-client';

interface VideoPlayerProps {
  roomId: string;
  videoPath: string;
}

const API_DOMAIN = process.env.NEXT_PUBLIC_API_DOMAIN;
const socket: Socket = io(API_DOMAIN);

const VideoPlayer: React.FC<VideoPlayerProps> = ({ roomId, videoPath }) => {
  const playerRef = useRef<ReactPlayer>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const lastEventSource = useRef<'local' | 'remote' | null>(null);
  const [showControls, setShowControls] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    socket.emit('join-room', { roomId });
    console.log(`Emitted 'join-room' for roomId: ${roomId}`);

    socket.on('sync', ({ currentTime, isPlaying }) => {
      if (lastEventSource.current !== 'local') {
        setCurrentTime(currentTime || 0);
        setIsPlaying(isPlaying);
        playerRef.current?.seekTo(currentTime || 0);
        console.log(`Received 'sync' for roomId: ${roomId} with currentTime: ${currentTime}, isPlaying: ${isPlaying}`);
      }
    });

    socket.on('play', ({ currentTime }) => {
      lastEventSource.current = 'remote';
      setIsPlaying(true);
      setCurrentTime(currentTime || 0);
      playerRef.current?.seekTo(currentTime || 0);
      console.log(`Received 'play' for roomId: ${roomId} at currentTime: ${currentTime}`);
    });

    socket.on('pause', ({ currentTime }) => {
      lastEventSource.current = 'remote';
      setIsPlaying(false);
      if (currentTime) {
        setCurrentTime(currentTime || 0);
        playerRef.current?.seekTo(currentTime || 0);
      }
      console.log(`Received 'pause' for roomId: ${roomId} at currentTime: ${currentTime}`);
    });

    socket.on('seek', ({ currentTime }) => {
      lastEventSource.current = 'remote';
      setCurrentTime(currentTime || 0);
      playerRef.current?.seekTo(currentTime || 0);
      console.log(`Received 'seek' for roomId: ${roomId} to currentTime: ${currentTime}`);
    });

    return () => {
      socket.off('sync');
      socket.off('play');
      socket.off('pause');
      socket.off('seek');
    };
  }, [roomId]);

  const handlePlayPause = () => {
    const currentTime = playerRef.current?.getCurrentTime() || 0;
    console.log(`Emitting '${isPlaying ? 'pause' : 'play'}' for roomId: ${roomId} at currentTime: ${currentTime}`);
    if (isPlaying) {
      setIsPlaying(false);
      socket.emit('pause', { roomId, currentTime });
    } else {
      setIsPlaying(true);
      socket.emit('play', { roomId, currentTime });
    }
    lastEventSource.current = 'local';
  };

  const handleSeek = (time: number) => {
    setCurrentTime(time);
    playerRef.current?.seekTo(time);
    socket.emit('seek', { roomId, currentTime: time });
    console.log(`Emitting 'seek' for roomId: ${roomId} to currentTime: ${time}`);
    lastEventSource.current = 'local';
  };

  const handleProgress = (progress: { playedSeconds: number }) => {
    setCurrentTime(progress.playedSeconds);
    console.log(`Progress updated: currentTime = ${progress.playedSeconds}`);
  };

  const handleDuration = (duration: number) => {
    setDuration(duration);
    console.log(`Video duration: ${duration}`);
  };

  const handleFullscreen = () => {
    if (containerRef.current) {
      if (!document.fullscreenElement) {
        containerRef.current.requestFullscreen();
        setIsFullscreen(true);
        console.log('Entering fullscreen mode');
      } else {
        document.exitFullscreen();
        setIsFullscreen(false);
        console.log('Exiting fullscreen mode');
      }
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  };

  const showControlBar = () => {
    setShowControls(true);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => setShowControls(false), 3000);
  };

  useEffect(() => {
    socket.emit('sync', { roomId, currentTime, isPlaying });
    console.log(`Emitted 'sync' for roomId: ${roomId} with currentTime: ${currentTime}, isPlaying: ${isPlaying}`);
  }, [currentTime, isPlaying]);

  return (
    <div
      ref={containerRef}
      className="relative flex flex-col items-center w-full h-full"
      onMouseMove={showControlBar}
    >
      <div className="relative overflow-hidden w-full aspect-video rounded-lg shadow-lg">
        <ReactPlayer
          ref={playerRef}
          url={`${API_DOMAIN}${videoPath}`}
          playing={isPlaying}
          controls={false}
          onProgress={handleProgress}
          onDuration={handleDuration}
          progressInterval={1000}
          width="100%"
          height="100%"
          className="absolute top-0 left-0 w-full h-full"
        />
      </div>
      {showControls && (
        <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 p-4 flex items-center gap-4">
          <button
            onClick={handlePlayPause}
            className="px-4 py-2 text-white rounded shadow"
          >
            {isPlaying ? <FaPause /> : <FaPlay />}
          </button>
          <span className="text-white">{formatTime(currentTime)}</span>
          <input
            type="range"
            min="0"
            max={duration || 0}
            step="0.1"
            value={currentTime || 0}
            onChange={(e) => handleSeek(parseFloat(e.target.value))}
            className="flex-1"
          />
          <span className="text-white">{formatTime(duration)}</span>
          <button
            onClick={handleFullscreen}
            className="px-4 py-2 text-white rounded shadow"
          >
            {isFullscreen ? <FaCompress /> : <FaExpand />}
          </button>
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;