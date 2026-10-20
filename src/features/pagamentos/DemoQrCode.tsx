export function DemoQrCode() {
  const cells = [
    [9,1],[11,1],[13,1],[9,3],[10,3],[12,3],[14,3],[8,5],[10,5],[12,5],[14,5],[9,7],[11,7],[13,7],
    [1,9],[3,9],[5,9],[7,9],[9,9],[12,9],[14,9],[16,9],[18,9],[20,9],[2,11],[6,11],[8,11],[10,11],[13,11],[17,11],[19,11],
    [9,13],[11,13],[14,13],[16,13],[20,13],[8,15],[10,15],[12,15],[15,15],[18,15],[20,15],[9,17],[13,17],[16,17],[19,17],
    [8,19],[10,19],[12,19],[14,19],[17,19],[20,19],[9,20],[13,20],[15,20],[18,20],
  ];
  return <div className="payment-qr" role="img" aria-label="QR Code demonstrativo para pagamento PIX"><svg viewBox="0 0 22 22" shapeRendering="crispEdges"><rect width="22" height="22" fill="#fff"/><Finder x={1} y={1}/><Finder x={15} y={1}/><Finder x={1} y={15}/>{cells.map(([x, y], index) => <rect key={index} x={x} y={y} width="1" height="1" fill="#111827"/>)}</svg></div>;
}

function Finder({ x, y }: { x: number; y: number }) {
  return <g transform={`translate(${x} ${y})`}><rect width="6" height="6" fill="#111827"/><rect x="1" y="1" width="4" height="4" fill="#fff"/><rect x="2" y="2" width="2" height="2" fill="#111827"/></g>;
}
