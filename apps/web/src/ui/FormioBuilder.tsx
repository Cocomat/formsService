import { FormBuilder } from "@formio/js";
import { useEffect, useRef } from "react";

type FormioBuilderInstance = InstanceType<typeof FormBuilder> & {
  _form?: Record<string, unknown>;
  formio?: {
    form?: Record<string, unknown>;
    on?: (event: string, handler: () => void) => void;
    off?: (event: string, handler: () => void) => void;
  };
  form?: Record<string, unknown>;
  instance?: {
    _form?: Record<string, unknown>;
    form?: Record<string, unknown>;
    on?: (event: string, handler: () => void) => void;
    off?: (event: string, handler: () => void) => void;
    destroy?: (all?: boolean) => void;
  };
  on?: (event: string, handler: () => void) => void;
  off?: (event: string, handler: () => void) => void;
  ready?: Promise<unknown>;
  destroy?: (all?: boolean) => void;
  webform?: {
    _form?: Record<string, unknown>;
    form?: Record<string, unknown>;
  };
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

const builderChangeEvents = [
  "addComponent",
  "cancelComponent",
  "change",
  "componentChange",
  "editComponent",
  "removeComponent",
  "saveComponent",
  "updateComponent"
];

function getBuilderSchema(builder: FormioBuilderInstance) {
  return (
    builder.instance?.form ??
    builder.instance?._form ??
    builder.form ??
    builder._form ??
    builder.webform?.form ??
    builder.webform?._form ??
    builder.formio?.form
  );
}

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
      window.setTimeout(() => {
        const nextSchema = getBuilderSchema(builder);
        if (nextSchema) onChangeRef.current(structuredClone(nextSchema));
      }, 25);
    };
    const bindEvents = () => {
      builderChangeEvents.forEach((event) => {
        builder.off?.(event, emitChange);
        builder.instance?.off?.(event, emitChange);
        builder.formio?.off?.(event, emitChange);
        builder.on?.(event, emitChange);
        builder.instance?.on?.(event, emitChange);
        builder.formio?.on?.(event, emitChange);
      });
    };

    bindEvents();
    emitChange();

    void builder.ready
      ?.then(() => {
        bindEvents();
        emitChange();
      })
      .catch(() => emitChange());

    return () => {
      builderChangeEvents.forEach((event) => {
        builder.off?.(event, emitChange);
        builder.instance?.off?.(event, emitChange);
        builder.formio?.off?.(event, emitChange);
      });
      builder.instance?.destroy?.(true);
      builder.destroy?.(true);
    };
  }, []);

  return <div className="formio-builder-host" ref={hostRef} />;
}
