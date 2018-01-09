export default function q(el) {
  return el.base.querySelector.bind(el.base);
}
