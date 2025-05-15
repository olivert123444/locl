/**
 * Simple event bus for cross-component communication
 */
type EventHandler = (data: any) => void;

class EventBus {
  private events: { [key: string]: EventHandler[] } = {};

  /**
   * Subscribe to an event
   * @param event Event name
   * @param callback Function to call when event is emitted
   */
  on(event: string, callback: EventHandler): void {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
  }

  /**
   * Unsubscribe from an event
   * @param event Event name
   * @param callback Function to remove from event handlers
   */
  off(event: string, callback: EventHandler): void {
    if (!this.events[event]) return;
    this.events[event] = this.events[event].filter(cb => cb !== callback);
  }

  /**
   * Emit an event with data
   * @param event Event name
   * @param data Data to pass to event handlers
   */
  emit(event: string, data: any = {}): void {
    if (!this.events[event]) return;
    
    console.log(`EventBus: Emitting "${event}" with data:`, data);
    
    this.events[event].forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in event handler for "${event}":`, error);
      }
    });
  }
}

// Create a singleton instance
const eventBus = new EventBus();

export default eventBus;
