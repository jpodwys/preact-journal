function getUniqueProps (computedProps) {
  let observedProps = [];
  for(let computedProp in computedProps){
    observedProps = observedProps.concat(computedProps[computedProp].args);
  }
  return Array.from(new Set(observedProps));
};

export default function compute (state, computedProps) {
  const uniqueProps = getUniqueProps(computedProps);
  let stateProxy;

  let compute = {
    set: function(obj, prop, value) {
      obj[prop] = value;

      if(uniqueProps.indexOf(prop) < 0) return true;

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
