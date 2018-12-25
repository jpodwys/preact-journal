export default function TestUtils(ACTION) {
  const NAME = 'UNIFIRE';

  const self = {
    node: undefined,
  
    cb: undefined,
  
    handler(e) {
      e.stopPropagation();
      if(e.detail[0] === ACTION){
        self.cb(e.detail[1], e.detail[2]);
      }
    },
  
    beforeEach() {
      const div = document.createElement('div');
      self.node = document.body.appendChild(div);
      self.cb = sinon.spy();
      self.node.addEventListener(NAME, self.handler);
    },
  
    afterEach() {
      self.node.removeEventListener(NAME, self.handler);
      self.node.remove();
    }
  };

  return self;
};
