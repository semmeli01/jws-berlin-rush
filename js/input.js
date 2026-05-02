// =============================================
// JWS: BERLIN RUSH — Input Manager
// Keyboard + Touch (Mobile-First)
// =============================================

class InputManager {
    constructor(canvas) {
        this.canvas = canvas;
        this._keys = new Set();

        // Consumed-once flags
        this.jumpJustPressed = false;
        this.pauseJustPressed = false;

        // Held state
        this.duckHeld = false;

        // Track active right-side touches for duck
        this._rightTouches = new Set();

        // ---- Debug telemetry (always maintained, ~zero overhead) ----
        this._dbgTouchCount  = 0;   // e.touches.length from last canvas touch event
        this._dbgLastType    = '';  // 'start' | 'end' | 'cancel'
        this._dbgLastTime    = 0;   // performance.now() of last canvas touch event
        this._dbgDocLastEl   = '';  // id/tag of last element touched outside canvas
        this._dbgDocLastTime = 0;

        this._setupKeyboard();
        this._setupTouch();

        // Track touches that land on elements OTHER than the canvas (passive, no perf cost)
        document.addEventListener('touchstart', (e) => {
            if (e.target !== this.canvas) {
                const el = e.target;
                this._dbgDocLastEl   = el.id || (el.className && String(el.className).split(' ')[0]) || el.tagName;
                this._dbgDocLastTime = performance.now();
            }
        }, { passive: true });
    }

    _setupKeyboard() {
        window.addEventListener('keydown', (e) => {
            if (document.activeElement && document.activeElement.tagName === 'INPUT') return;
            if (this._keys.has(e.code)) return; // already held
            this._keys.add(e.code);

            if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
                this.jumpJustPressed = true;
                e.preventDefault();
            }
            if (e.code === 'Escape' || e.code === 'KeyP') {
                this.pauseJustPressed = true;
                e.preventDefault();
            }
            if (e.code === 'ArrowDown' || e.code === 'KeyS') {
                this.duckHeld = true;
                e.preventDefault();
            }
        });

        window.addEventListener('keyup', (e) => {
            if (document.activeElement && document.activeElement.tagName === 'INPUT') return;
            this._keys.delete(e.code);
            if (e.code === 'ArrowDown' || e.code === 'KeyS') {
                this.duckHeld = false;
            }
        });

        // When the window loses focus, key-up events are missed → keys get stuck.
        // Clear all held state so the next keydown is always recognized.
        window.addEventListener('blur', () => {
            this._keys.clear();
            this.duckHeld = false;
            this.jumpJustPressed = false;
            this.pauseJustPressed = false;
            this._rightTouches.clear();
        });

        // Also reset on tab visibility change (mobile background, Alt+Tab, etc.)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this._keys.clear();
                this.duckHeld = false;
                this.jumpJustPressed = false;
                this.pauseJustPressed = false;
                this._rightTouches.clear();
            }
        });
    }

    _setupTouch() {
        // Determine which half of the canvas was touched
        const getRelX = (touch) => {
            const rect = this.canvas.getBoundingClientRect();
            return (touch.clientX - rect.left) / rect.width;
        };

        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this._dbgTouchCount = e.touches.length;
            this._dbgLastType   = 'start';
            this._dbgLastTime   = performance.now();
            for (const touch of e.changedTouches) {
                const rx = getRelX(touch);
                if (rx < 0.5) {
                    // Left half → JUMP
                    this.jumpJustPressed = true;
                } else {
                    // Right half → DUCK (hold)
                    this._rightTouches.add(touch.identifier);
                    this.duckHeld = true;
                }
            }
        }, { passive: false });

        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            this._dbgTouchCount = e.touches.length;
            this._dbgLastType   = 'end';
            this._dbgLastTime   = performance.now();
            let anyRight = false;
            for (const touch of e.changedTouches) {
                if (this._rightTouches.delete(touch.identifier)) anyRight = true;
            }
            // Only clear duckHeld when a tracked right-side canvas touch ends.
            // Left-side (jump) touchend must not clear duck — duckBtn in portrait
            // sets duckHeld independently of _rightTouches.
            if (anyRight && this._rightTouches.size === 0) {
                this.duckHeld = false;
            }
        }, { passive: false });

        this.canvas.addEventListener('touchcancel', (e) => {
            e.preventDefault();
            this._dbgTouchCount = e.touches.length;
            this._dbgLastType   = 'cancel';
            this._dbgLastTime   = performance.now();
            let anyRight = false;
            for (const touch of e.changedTouches) {
                if (this._rightTouches.delete(touch.identifier)) anyRight = true;
            }
            if (anyRight && this._rightTouches.size === 0) {
                this.duckHeld = false;
            }
        }, { passive: false });
    }

    /** Consume jump press (one-shot) */
    consumeJump() {
        const v = this.jumpJustPressed;
        this.jumpJustPressed = false;
        return v;
    }

    /** Consume pause press (one-shot) */
    consumePause() {
        const v = this.pauseJustPressed;
        this.pauseJustPressed = false;
        return v;
    }

    /** Whether duck/slide is currently held */
    get isDucking() {
        return this.duckHeld;
    }

    /** Full reset (e.g. on state change) */
    reset() {
        this.jumpJustPressed = false;
        this.pauseJustPressed = false;
        this.duckHeld = false;
        this._rightTouches.clear();
        this._keys.clear();
    }
}
