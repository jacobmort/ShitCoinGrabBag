class AbortHelper {
  constructor() {
    this.errTypes = {
      revert            : "revert",
      outOfGas          : "out of gas",
      invalidJump       : "invalid JUMP",
      invalidOpcode     : "invalid opcode",
      stackOverflow     : "stack overflow",
      stackUnderflow    : "stack underflow",
      staticStateChange : "static state change"
    };
  }
  

  static async tryCatch(promise, errType) {
    const PREFIX = "VM Exception while processing transaction: ";
    try {
      await promise;
      throw null;
    }
    catch (error){
      assert(error.message.startsWith(PREFIX + errType), "Expected an error starting with '" + PREFIX + errType + "' but got '" + error.message + "' instead");
    }
  }
}

module.exports = AbortHelper;