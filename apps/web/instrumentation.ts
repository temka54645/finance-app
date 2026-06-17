// pdfjs-dist (pdf-parse v2-р ашиглагддаг) Node.js-д байхгүй DOM API-уудын polyfill
if (typeof globalThis.DOMMatrix === "undefined") {
  (globalThis as any).DOMMatrix = class DOMMatrix {
    a=1; b=0; c=0; d=1; e=0; f=0;
    m11=1; m12=0; m13=0; m14=0;
    m21=0; m22=1; m23=0; m24=0;
    m31=0; m32=0; m33=1; m34=0;
    m41=0; m42=0; m43=0; m44=1;
    is2D=true; isIdentity=true;
    constructor(_init?: any) {}
    multiply() { return new (globalThis as any).DOMMatrix(); }
    translate() { return new (globalThis as any).DOMMatrix(); }
    scale() { return new (globalThis as any).DOMMatrix(); }
    rotate() { return new (globalThis as any).DOMMatrix(); }
    inverse() { return new (globalThis as any).DOMMatrix(); }
    transformPoint(p: any) { return { x: p?.x ?? 0, y: p?.y ?? 0, z: 0, w: 1 }; }
    toFloat32Array() { return new Float32Array([this.a,this.b,this.c,this.d,this.e,this.f]); }
    toFloat64Array() { return new Float64Array([this.a,this.b,this.c,this.d,this.e,this.f]); }
    toString() { return `matrix(${this.a},${this.b},${this.c},${this.d},${this.e},${this.f})`; }
    static fromMatrix(m: any) { return new (globalThis as any).DOMMatrix(); }
    static fromFloat32Array(a: Float32Array) { return new (globalThis as any).DOMMatrix(); }
    static fromFloat64Array(a: Float64Array) { return new (globalThis as any).DOMMatrix(); }
  };
}

if (typeof globalThis.ImageData === "undefined") {
  (globalThis as any).ImageData = class ImageData {
    data: Uint8ClampedArray;
    width: number;
    height: number;
    colorSpace: string = "srgb";
    constructor(widthOrData: any, height: number, _opts?: any) {
      if (widthOrData instanceof Uint8ClampedArray) {
        this.data = widthOrData;
        this.width = height;
        this.height = widthOrData.length / (4 * height);
      } else {
        this.width = widthOrData;
        this.height = height;
        this.data = new Uint8ClampedArray(widthOrData * height * 4);
      }
    }
  };
}

if (typeof globalThis.Path2D === "undefined") {
  (globalThis as any).Path2D = class Path2D {
    constructor(_path?: any) {}
    addPath() {}
    closePath() {}
    moveTo() {}
    lineTo() {}
    bezierCurveTo() {}
    quadraticCurveTo() {}
    arc() {}
    arcTo() {}
    ellipse() {}
    rect() {}
  };
}

// Сервер эхлэх бүрд (зөвхөн development үед) database цэвэрлэнэ.
// Production-д ажиллахгүй — хэд хэдэн давхар хамгаалалт:
//   1) NODE_ENV !== "development"
//   2) DISABLE_DB_RESET === "1" (.env-д explicit тохируулж болно)
//   3) Дотоод `cleared` flag (нэг л удаа ажиллана)

let cleared = false;

export async function register() {
  if (cleared) return;
  if (process.env.NODE_ENV !== "development") return;
  if (process.env.DISABLE_DB_RESET === "1") return;
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  cleared = true;
  try {
    const { prisma } = await import("@/lib/db");
    await prisma.transaction.deleteMany();
    await prisma.statement.deleteMany();
    // User-ийг үлдээнэ — нэвтэрсэн хэрэглэгчээ алдахгүй
    console.log("[instrumentation] Statement + Transaction цэвэрлэгдлээ (dev mode)");
  } catch (err) {
    console.error("[instrumentation] Цэвэрлэхэд алдаа:", err);
  }
}
