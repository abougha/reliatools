declare module "react-katex" {
  import * as React from "react";

  interface BlockMathProps {
    math: string;
    errorColor?: string;
  }

  interface InlineMathProps {
    math: string;
    errorColor?: string;
  }

  export class BlockMath extends React.Component<BlockMathProps> {}
  export class InlineMath extends React.Component<InlineMathProps> {}
}
