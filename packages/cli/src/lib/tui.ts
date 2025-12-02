/**
 * TUI (Terminal User Interface) for event viewer
 * Uses blessed for terminal UI rendering
 */

import blessed from "blessed";
import type { Event } from "./dev-server";

export interface TUIEvent extends Event {
  id: string;
  action: string;
  category: string;
  actor?: { id?: string; email?: string; name?: string };
  payload?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export class EventViewerTUI {
  private screen: blessed.Widgets.Screen;
  private eventList: blessed.Widgets.List;
  private eventDetails: blessed.Widgets.Box;
  private statsBox: blessed.Widgets.Box;
  private events: TUIEvent[] = [];
  private selectedIndex = 0;

  constructor() {
    // Create screen
    this.screen = blessed.screen({
      smartCSR: true,
      title: "HyreLog Dev Simulator - Event Viewer",
    });

    // Stats box at the top
    this.statsBox = blessed.box({
      top: 0,
      left: 0,
      width: "100%",
      height: 3,
      content: "Events: 0 | Press 'q' to quit, 'c' to clear",
      style: {
        fg: "white",
        bg: "blue",
      },
    });

    // Event list on the left
    this.eventList = blessed.list({
      top: 3,
      left: 0,
      width: "50%",
      height: "100%-3",
      keys: true,
      vi: true,
      style: {
        selected: {
          bg: "blue",
          fg: "white",
        },
      },
      border: {
        type: "line",
      },
      label: " Events ",
    });

    // Event details on the right
    this.eventDetails = blessed.box({
      top: 3,
      left: "50%",
      width: "50%",
      height: "100%-3",
      content: "Select an event to view details",
      scrollable: true,
      alwaysScroll: true,
      keys: true,
      vi: true,
      style: {
        fg: "white",
      },
      border: {
        type: "line",
      },
      label: " Event Details ",
    });

    // Append widgets
    this.screen.append(this.statsBox);
    this.screen.append(this.eventList);
    this.screen.append(this.eventDetails);

    // Handle events
    this.eventList.on("select", (item, index) => {
      this.selectedIndex = index;
      this.updateEventDetails();
    });

    // Quit on Escape, q, or Control-C
    this.screen.key(["escape", "q", "C-c"], () => {
      return process.exit(0);
    });

    // Clear events on 'c'
    this.screen.key(["c"], () => {
      this.events = [];
      this.updateEventList();
      this.updateStats();
    });

    // Initial render
    this.updateEventList();
    this.updateStats();
    this.screen.render();
  }

  addEvent(event: TUIEvent): void {
    this.events.unshift(event); // Add to beginning
    if (this.events.length > 1000) {
      this.events = this.events.slice(0, 1000); // Keep last 1000
    }
    this.updateEventList();
    this.updateStats();
    this.screen.render();
  }

  private updateEventList(): void {
    const items = this.events.map((event, index) => {
      const time = new Date(event.createdAt).toLocaleTimeString();
      const actor = event.actor?.email || event.actor?.id || "unknown";
      return `${time} | ${event.action} | ${actor}`;
    });

    this.eventList.setItems(items);
    if (this.selectedIndex >= items.length) {
      this.selectedIndex = Math.max(0, items.length - 1);
    }
    this.eventList.select(this.selectedIndex);
  }

  private updateEventDetails(): void {
    if (this.events.length === 0 || this.selectedIndex >= this.events.length) {
      this.eventDetails.setContent("No events to display");
      this.screen.render();
      return;
    }

    const event = this.events[this.selectedIndex]!;
    const details = [
      `ID: ${event.id}`,
      `Action: ${event.action}`,
      `Category: ${event.category}`,
      `Created: ${new Date(event.createdAt).toLocaleString()}`,
      "",
      "Actor:",
      event.actor
        ? `  ID: ${event.actor.id || "N/A"}\n  Email: ${event.actor.email || "N/A"}\n  Name: ${event.actor.name || "N/A"}`
        : "  N/A",
      "",
      "Payload:",
      JSON.stringify(event.payload || {}, null, 2),
      "",
      "Metadata:",
      JSON.stringify(event.metadata || {}, null, 2),
    ].join("\n");

    this.eventDetails.setContent(details);
    this.screen.render();
  }

  private updateStats(): void {
    const total = this.events.length;
    const byCategory = this.events.reduce((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const categoryStats = Object.entries(byCategory)
      .map(([cat, count]) => `${cat}: ${count}`)
      .join(" | ");

    this.statsBox.setContent(`Events: ${total} | ${categoryStats} | Press 'q' to quit, 'c' to clear`);
  }

  render(): void {
    this.screen.render();
  }

  destroy(): void {
    this.screen.destroy();
  }
}

