import io from 'socket.io-client';

const API_DOMAIN = process.env.NEXT_PUBLIC_API_DOMAIN;
const socket = io(API_DOMAIN);

export default socket;