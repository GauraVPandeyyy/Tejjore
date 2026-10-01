export type ConciergeMessage = {
  role: "user" | "assistant";
  content: string;
};

export type ConciergeAction = {
  label: string;
  href: string;
  external?: boolean;
};

export type ConciergeReply = ConciergeMessage & {
  intent: string;
  actions?: ConciergeAction[];
  dataSource?: "live-operations" | "hotel-knowledge";
  asOf?: string;
};

export interface ConciergeProvider {
  reply(messages: ConciergeMessage[]): Promise<ConciergeReply>;
}

export interface ConciergeLanguageLayer {
  rewrite(reply: ConciergeReply, messages: ConciergeMessage[]): Promise<ConciergeReply>;
}
