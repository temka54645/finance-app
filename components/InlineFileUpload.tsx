"use client";

import FileUpload from "./FileUpload";

interface Props {
  onSuccess: () => void;
}

export default function InlineFileUpload({ onSuccess }: Props) {
  return <FileUpload onSuccess={onSuccess} compact />;
}
