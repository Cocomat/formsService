import { FormBuilder } from "@formio/js";
import { useEffect, useRef } from "react";

type FormioBuilderInstance = InstanceType<typeof FormBuilder> & {
  form?: Record<string, unknown>;
  instance?: {
    form?: Record<string, unknown>;
    on?: (event: string, handler: () => void) => void;
    off?: (event: string, handler: () => void) => void;
    destroy?: (all?: boolean) => void;
  };
  on?: (event: string, handler: () => void) => void;
  off?: (event: string, handler: () => void) => void;
  ready?: Promise<unknown>;
  destroy?: (all?: boolean) => void;
};

type FormioBuilderProps = {
  schema: Record<string, unknown>;
  onChange: (schema: Record<string, unknown>) => void;
};

const builderOptions = {
  noDefaultSubmitButton: false,
  alwaysConfirmComponentRemoval: true,
  builder: {
    premium: false,
    resource: false
  }
};

export function FormioBuilder({ schema, onChange }: FormioBuilderProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!hostRef.current) return;

    const builder = new FormBuilder(hostRef.current, schema, builderOptions) as FormioBuilderInstance;
    const emitChange = () => {
      const nextSchema = builder.instance?.form ?? builder.form;
      if (nextSchema) onChangeRef.current(structuredClone(nextSchema));
    };

    void builder.ready?.then(() => {
      builder.on?.("change", emitChange);
      builder.instance?.on?.("change", emitChange);
      emitChange();
    });

    return () => {
      builder.off?.("change", emitChange);
      builder.instance?.off?.("change", emitChange);
      builder.instance?.destroy?.(true);
      builder.destroy?.(true);
    };
  }, []);

  return <div className="formio-builder-host" ref={hostRef} />;
}
