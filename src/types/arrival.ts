import type { RoomId } from "./hotel";

export type ArrivalTabId = "arrival" | "stay" | "dining" | "explore" | "help";

export type ArrivalStay = {
  reference: string;
  guestName: string;
  roomId: RoomId;
  checkIn: string;
  checkOut: string;
  mode: "demo" | "connected";
};

export type ArrivalPlace = {
  id: string;
  name: string;
  category: string;
  mapsQuery: string;
};
