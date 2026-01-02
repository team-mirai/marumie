import "react";

declare module "react" {
  interface StyleHTMLAttributes<_T> {
    jsx?: boolean;
    global?: boolean;
  }
}
