/**
 * Simple spinner utility for CLI operations
 */
class Spinner {
  constructor(text = 'Loading...') {
    this.text = text;
    this.frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    this.currentFrame = 0;
    this.interval = null;
    this.isSpinning = false;
  }

  start(text) {
    if (text) {
      this.text = text;
    }

    if (this.isSpinning) {
      return;
    }

    this.isSpinning = true;
    this.currentFrame = 0;

    // Hide cursor
    process.stdout.write('\x1B[?25l');

    this.interval = setInterval(() => {
      process.stdout.write(`\r${this.frames[this.currentFrame]} ${this.text}`);
      this.currentFrame = (this.currentFrame + 1) % this.frames.length;
    }, 100);
  }

  stop(finalText) {
    if (!this.isSpinning) {
      return;
    }

    this.isSpinning = false;
    
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }

    // Clear line and show cursor
    process.stdout.write('\r\x1B[K');
    process.stdout.write('\x1B[?25h');

    if (finalText) {
      console.log(finalText);
    }
  }

  succeed(text) {
    this.stop(`✅ ${text || this.text}`);
  }

  fail(text) {
    this.stop(`❌ ${text || this.text}`);
  }

  warn(text) {
    this.stop(`⚠️  ${text || this.text}`);
  }

  info(text) {
    this.stop(`ℹ️  ${text || this.text}`);
  }

  updateText(text) {
    this.text = text;
  }
}

module.exports = Spinner;
