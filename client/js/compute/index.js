export default function compute (state, computedProps) {
  const observedProps = [];

  for(let computedProp in computedProps){
    observedProps.concat(computedProps[computedProp].args);
  }

  const uniqueProps = Array.from(new Set(observedProps));

  let stateProxy;

  let compute = {
    set: function(obj, prop, value) {
      obj[prop] = value;

      if(uniqueProps.indexOf < 0) return true;

      for(let computedProp in computedProps){
        let computedConfig = computedProps[computedProp];
        if(~computedConfig.args.indexOf(prop)){
          let computedArgs = computedConfig.args.map(arg => {
            return obj[arg];
          });
          stateProxy[computedProp] = computedConfig.computer(...computedArgs);
        }
      }

      return true;
    }
  };

  stateProxy = new Proxy(state, compute);
  return stateProxy;
};
