export default function compute (state, computedProps) {
  let compute = {
    set: function(obj, prop, value) {
      obj[prop] = value;

      for(let computedProp in computedProps){
        let computedConfig = computedProps[computedProp];
        if(~computedConfig.args.indexOf(prop)){
          let computedArgs = computedConfig.args.map(arg => {
            return obj[arg];
          });
          obj[computedProp] = computedConfig.computer(...computedArgs);
        }
      }

      return true;
    }
  };

  return new Proxy(state, compute);
};
