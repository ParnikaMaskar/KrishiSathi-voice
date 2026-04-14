export const CONFIG = {
  /**
   * IMPORTANT: Replace this with your computer's local IP address.
   * 1. Open Terminal/CMD on your computer.
   * 2. Run 'ipconfig' (Windows) or 'ifconfig' (Mac/Linux).
   * 3. Find the 'IPv4 Address' under your active WiFi/Ethernet connection.
   * 4. Example: '192.168.1.5'
   */
  SERVER_IP: '10.17.27.249', // <--- Your Wi-Fi IP address
  //SERVER_IP: '10.17.27.2', // <--- Your Wi-Fi IP address
  SERVER_PORT: '8765',
};

export const getSocketUrl = () => `ws://${CONFIG.SERVER_IP}:${CONFIG.SERVER_PORT}`;
