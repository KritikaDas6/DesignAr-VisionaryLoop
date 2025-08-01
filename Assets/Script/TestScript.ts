// Simple test script to verify script loading
print("[TestScript] Script file is being loaded");

@component
export class TestScript extends BaseScriptComponent {
  
  onAwake() {
    print("[TestScript] onAwake called");
  }
  
  onStart() {
    print("[TestScript] onStart called");
  }
  
  onUpdate() {
    // Only print occasionally to avoid spam
    if (Math.random() < 0.01) {
      print("[TestScript] onUpdate running");
    }
  }
} 