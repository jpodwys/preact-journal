export default function fire (name, detail) {
  return (e) => {
    const event = new CustomEvent(name, { detail: [ detail, e ] });
    document.dispatchEvent(event);
  }
};
