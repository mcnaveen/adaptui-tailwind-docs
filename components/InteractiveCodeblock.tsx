import React from "react";
import { LiveEditor, LiveError, LivePreview, LiveProvider } from "react-live";
import {
  Button,
  Checkbox,
  runIfFn,
  Select,
  useHasMounted,
  useTheme,
} from "@renderlesskit/react-tailwind";
import * as Renderlesskit from "@renderlesskit/react-tailwind";
import { useClipboard } from "@chakra-ui/hooks";
import { get } from "lodash";
import prismTheme from "prism-react-renderer/themes/palenight";
import { tw } from "twind";

type TemplateFunctionProps = {
  booleanProps: string[];
  themeProps: string[];
  choiceProps: string[];
  spreadProps: string;
  props: Record<string, any>;
};

type TemplateFunction = (props: TemplateFunctionProps) => string;

type InteractiveCodeblockProps = {
  booleanProps: string[];
  themeProps: Record<string, string>;
  choiceProps: Record<string, string[]>;
  children?: TemplateFunction;
};

const wrapperStyles = "mt-2 flex items-center flex-wrap space-x-4";

export const InteractiveCodeblock = (props: InteractiveCodeblockProps) => {
  const {
    children = "",
    themeProps = {},
    choiceProps = {},
    booleanProps = [],
  } = props;

  const theme = useTheme();
  const [booleanStates, onBooleanStateChange] = React.useState<
    Record<string, boolean>
  >({});
  const [themeStates, setThemeStates] = React.useState<Record<string, string>>(
    {},
  );
  const [choiceStates, setChoiceState] = React.useState<Record<string, any>>(
    {},
  );

  const finalBooleanProps = Object.keys(booleanStates).filter(
    key => booleanStates[key],
  );
  const finalThemeProps = Object.keys(themeStates).map(key =>
    mapThemeProps(key, themeStates),
  );
  const finalChoiceProps = Object.keys(choiceStates).map(key =>
    mapChoiceProps(key, choiceStates),
  );

  const spreadProps = [finalBooleanProps, finalThemeProps, finalChoiceProps]
    .map(printProps)
    .join("")
    .trimEnd()
    .replace(/\s\s+/, " ");

  const code = runIfFn(children, {
    spreadProps,
    themeProps: finalThemeProps,
    choiceProps: finalChoiceProps,
    booleanProps: finalBooleanProps,
    props: { ...themeStates, ...booleanStates, ...choiceStates },
  });

  const scope = {
    React,
    ...Renderlesskit,
    tw,
  };

  const mounted = useHasMounted();

  if (!mounted) return null;

  return (
    <div className="mt-6">
      <LiveProvider
        transformCode={rawCode => transformer(rawCode)}
        code={code}
        scope={scope}
        theme={prismTheme}
      >
        <div className="relative">
          <LivePreview className="p-6 bg-white border border-gray-600 rounded-md rounded-b-none" />
          <CopyButton code={code} />
        </div>
        <LiveEditor className="font-mono text-sm rounded-md rounded-t-none" />
        <LiveError className="mt-0 text-xs text-red-500 bg-red-100 rounded-md rounded-t-none" />
      </LiveProvider>
      <div className={wrapperStyles}>
        {booleanProps.map(name => {
          return (
            <Checkbox
              key={name}
              label={capitalizeFirstLetter(name as string)}
              state={booleanStates.loading}
              onStateChange={value => {
                onBooleanStateChange(prev => ({ ...prev, [name]: !!value }));
              }}
            />
          );
        })}
      </div>
      <div className={wrapperStyles}>
        {Object.keys(themeProps).map(name => {
          const themeKey = themeProps[name];
          return (
            <Select
              key={name}
              name={name}
              value={themeStates[name]}
              onChange={event =>
                setThemeStates(prev => ({
                  ...prev,
                  [name]: event.target.value,
                }))
              }
            >
              <option value="">Choose {name}</option>

              {Object.keys(get(theme, themeKey)).map(size => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </Select>
          );
        })}
        {Object.keys(choiceProps).map(name => {
          const values = choiceProps[name];

          return (
            <Select
              key={name}
              name={name}
              value={choiceStates[name]}
              onChange={event =>
                setChoiceState(prev => ({
                  ...prev,
                  [name]: event.target.value,
                }))
              }
            >
              <option selected value="">
                Choose {name}
              </option>

              {values?.map(value => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </Select>
          );
        })}
      </div>
    </div>
  );
};

export default InteractiveCodeblock;

const mapThemeProps = (name: string, unions: Record<string, any>) => {
  return unions[name] && `${name}="${unions[name]}"`;
};
const mapChoiceProps = (name: string, unions: Record<string, any>) => {
  return unions[name] && `${name}={${unions[name]}}`;
};

const printProps = (props: string[]) => {
  return " " + props.filter(Boolean).join(" ");
};

function capitalizeFirstLetter(string: string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

export type CopyButtonProps = {
  code: string;
};

export const CopyButton: React.FC<CopyButtonProps> = ({ code }) => {
  const { hasCopied, onCopy } = useClipboard(code);

  return (
    <span className="absolute right-0 transform -translate-x-2 translate-y-4 -top-2">
      <Button size="sm" onClick={onCopy}>
        {hasCopied ? "COPIED!" : "COPY"}
      </Button>
    </span>
  );
};

const transformer = (rawCode: string) => {
  const code = rawCode
    // remove imports
    .replace(/((^|)import[^;]+[; ]+)+/gi, "")
    // replace `export default => {*};` with `render(() => {*});`
    .replace(/export default \(\) => {((.|\n)*)};/, "render(() => {$1});")
    // replace `export default => (*);` with `render(*);`
    .replace(/export default \(\) => \(((.|\n)*)\);/, "render($1);")
    // replace `export default => *;` with `render(*);`
    .replace(/export default \(\) => ((.|\n)*);/, "render($1);")
    .replace(/export default ((.|\n)*);/, "render($1);");

  return `<>${code}</>`;
};