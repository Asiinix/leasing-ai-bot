"use client";
"use client";

// src/components/button/Button.tsx
import { forwardRef } from "react";

// src/components/button/component/base-buttton/BaseButton.tsx
import React2, { useRef, useState } from "react";

// src/hooks/useFocus.ts
import React from "react";
var prevInputMethod;
function handleKeyDown(event) {
  if (event.key === "Tab") {
    prevInputMethod = "keyboard";
  }
}
function handleMouseDown() {
  prevInputMethod = "mouse";
}
function handleTouchStart() {
  prevInputMethod = "mouse";
}
function addGlobalListeners() {
  document.addEventListener("keydown", handleKeyDown);
  document.addEventListener("mousedown", handleMouseDown);
  document.addEventListener("touchstart", handleTouchStart);
}
function useFocus(ref, inputMethod) {
  const [focus, setFocus] = React.useState(false);
  const handleFocus = React.useCallback(() => {
    if (!inputMethod || inputMethod === prevInputMethod) {
      setFocus(true);
    }
  }, [inputMethod]);
  const handleBlur = React.useCallback(() => {
    setFocus(false);
  }, []);
  React.useEffect(() => {
    const node = ref?.current;
    if (node) {
      node.addEventListener("focusin", handleFocus);
      node.addEventListener("focusout", handleBlur);
    }
    return () => {
      if (node) {
        node.removeEventListener("focusin", handleFocus);
        node.removeEventListener("focusout", handleBlur);
      }
    };
  }, [handleBlur, handleFocus, ref]);
  React.useEffect(addGlobalListeners, []);
  return [focus];
}

// src/utilities/cn.ts
import { withNaming } from "@bem-react/classname";
var NAMESPACE = "bcc-";
var NAMESPACE_NEW = "g-";
var cn = withNaming({ e: "__", m: "_" });
var block = withNaming({ n: NAMESPACE, e: "__", m: "_" });
var blockNew = withNaming({ n: NAMESPACE_NEW, e: "__", m: "_" });
function modsClassName(className) {
  return className.split(/\s(.*)/)[1];
}

// src/utilities/keyboard.ts
var Keys = {
  BACKSPACE: 8,
  TAB: 9,
  ENTER: 13,
  CAPS_LOCK: 20,
  ESC: 27,
  SPACE: 32,
  PAGE_UP: 33,
  PAGE_DOWN: 34,
  END: 35,
  HOME: 36,
  LEFT: 37,
  UP: 38,
  RIGHT: 39,
  DOWN: 40,
  INSERT: 45,
  DELETE: 46
};
var isKeyCode = (code, keys) => {
  return keys.some((value) => Keys[value] === code || value === code);
};

// src/utilities/mergeRefs.ts
function mergeRefs(refs) {
  return (value) => {
    refs.forEach((ref) => {
      if (typeof ref === "function") {
        ref(value);
      } else if (ref != null) {
        ref.current = value;
      }
    });
  };
}

// src/components/button/Button.type.tsx
var EButtonVariant = /* @__PURE__ */ ((EButtonVariant2) => {
  EButtonVariant2["AccentPrimary"] = "accentPrimary";
  EButtonVariant2["AccentSecondary"] = "accentSecondary";
  EButtonVariant2["AccentTertiary"] = "accentTertiary";
  EButtonVariant2["InvertPrimary"] = "invertPrimary";
  EButtonVariant2["InvertSecondary"] = "invertSecondary";
  EButtonVariant2["InvertTertiary"] = "invertTertiary";
  EButtonVariant2["Destructive"] = "destructive";
  EButtonVariant2["Neutral"] = "neutral";
  EButtonVariant2["Link"] = "link";
  EButtonVariant2["Ghost"] = "ghost";
  return EButtonVariant2;
})(EButtonVariant || {});

// src/components/button/component/loading-dots/LoadingDots.tsx
import { jsx, jsxs } from "react/jsx-runtime";
var b = block("button-loading-dots");
var LoadingDots = ({ view = "accentSecondary", size }) => {
  const dotClassName = b("dot", { [view]: true, [size]: true });
  return /* @__PURE__ */ jsxs("div", { className: b(), children: [
    /* @__PURE__ */ jsx("div", { className: dotClassName }),
    /* @__PURE__ */ jsx("div", { className: dotClassName }),
    /* @__PURE__ */ jsx("div", { className: dotClassName })
  ] });
};

// src/components/button/component/base-buttton/BaseButton.tsx
import { Fragment, jsx as jsx2, jsxs as jsxs2 } from "react/jsx-runtime";
var b2 = block("button");
var BaseButton = React2.forwardRef(
  ({
    type = "button",
    htmlType = "button",
    fullWidth = false,
    iconLeft,
    iconRight,
    view = "accentPrimary" /* AccentPrimary */,
    size = "m",
    children,
    href,
    pressKeys = [Keys.SPACE, Keys.ENTER],
    onClick,
    disabled = false,
    loading = false,
    onKeyDown,
    onKeyUp,
    onBlur,
    onMouseDown,
    onMouseUp,
    onMouseLeave,
    style,
    className,
    id,
    ...props
  }, ref) => {
    const Component = href ? "a" : "button";
    const [pressed, setPressed] = useState(false);
    const iconOnly = !children;
    const internalInnerRef = useRef(null);
    const [focused] = useFocus(internalInnerRef, "keyboard");
    const isRightIcon = Boolean(iconRight) && !iconOnly;
    const isLeftIcon = Boolean(iconLeft) && !iconOnly;
    const handleBlur = (event) => {
      setPressed(false);
      if (onBlur !== void 0) {
        onBlur(event);
      }
    };
    const handleKeyDown2 = (event) => {
      if (isKeyCode(event.keyCode, pressKeys)) {
        setPressed(true);
      }
      if (onKeyDown !== void 0) {
        onKeyDown(event);
      }
    };
    const handleKeyUp = (event) => {
      if (isKeyCode(event.keyCode, pressKeys)) {
        setPressed(false);
      }
      if (onKeyUp !== void 0) {
        onKeyUp(event);
      }
    };
    const handleMouseDown2 = (event) => {
      if (navigator.userAgent.match(/safari/i)) {
        event.preventDefault();
      }
      setPressed(true);
      if (onMouseDown !== void 0) {
        onMouseDown(event);
      }
    };
    const handleMouseUp = (event) => {
      setPressed(false);
      if (onMouseUp) {
        onMouseUp(event);
      }
    };
    const handleMouseLeave = (event) => {
      setPressed(false);
      if (onMouseLeave !== void 0) {
        onMouseLeave(event);
      }
    };
    const handleClick = (e) => {
      if (disabled || loading) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      if (internalInnerRef.current) {
        internalInnerRef.current.focus();
      }
      onClick?.(e);
    };
    const componentProps = {
      className: b2(
        {
          view,
          size,
          disabled,
          pressed,
          focused,
          iconOnly,
          fullWidth
        },
        className
      )
    };
    const childrenProps = {
      className: b2({
        nowrap: fullWidth,
        stretchText: !iconLeft && !iconRight,
        addonLeft: isLeftIcon,
        addonRight: isRightIcon,
        loading: Boolean(loading)
      })
    };
    const buttonChildren = /* @__PURE__ */ jsxs2(Fragment, { children: [
      iconLeft && /* @__PURE__ */ jsx2("span", { className: b2({ loading, addonLeftIcon: isLeftIcon }), children: iconLeft }),
      children && /* @__PURE__ */ jsx2("span", { className: childrenProps.className, children }),
      iconRight && /* @__PURE__ */ jsx2("span", { className: b2({ loading, addonRightIcon: isRightIcon }), children: iconRight }),
      loading && /* @__PURE__ */ jsx2(LoadingDots, { view, size })
    ] });
    return /* @__PURE__ */ jsx2(
      Component,
      {
        ...props,
        ...componentProps,
        type: htmlType,
        id,
        style,
        ref: mergeRefs([ref, internalInnerRef]),
        "aria-pressed": props["aria-pressed"],
        "aria-disabled": disabled || loading,
        "aria-busy": loading,
        disabled: disabled || loading,
        onBlur: handleBlur,
        onKeyDown: handleKeyDown2,
        onKeyUp: handleKeyUp,
        onClick: handleClick,
        onMouseLeave: handleMouseLeave,
        onMouseUp: handleMouseUp,
        onMouseDown: handleMouseDown2,
        tabIndex: disabled || loading ? -1 : props.tabIndex ?? 0,
        children: buttonChildren
      }
    );
  }
);

// src/components/button/Button.tsx
import { jsx as jsx3 } from "react/jsx-runtime";
var Button = forwardRef(
  ({ children, ...restProps }, ref) => {
    const Component = BaseButton;
    return /* @__PURE__ */ jsx3(Component, { ref, ...restProps, children });
  }
);

// src/components/input/Input.tsx
import { forwardRef as forwardRef4, memo as memo3, useMemo as useMemo2 } from "react";

// src/components/form-control/base-form-control/BaseFormControl.tsx
import React3 from "react";
import { jsx as jsx4, jsxs as jsxs3 } from "react/jsx-runtime";
var b3 = block("form-control");
var BaseFormControl = React3.forwardRef(
  ({
    // inputContainer props
    fullWidth = false,
    filled,
    disabled,
    focused,
    error,
    labelType = "outer",
    label,
    hint,
    leftAddon = null,
    rightAddon = null,
    children,
    onClick,
    onMouseDown,
    onMouseUp,
    // wrapper rest props
    ...wrapperRestProps
  }, ref) => {
    const outerLabel = Boolean(label && labelType === "outer");
    const innerLabel = Boolean(label && labelType === "inner");
    const active = Boolean(innerLabel && (filled || focused));
    return /* @__PURE__ */ jsxs3("div", { className: b3({ fullWidth, disabled }), ...wrapperRestProps, children: [
      /* @__PURE__ */ jsx4("span", { className: b3("label", { outerLabel }), children: label }),
      /* @__PURE__ */ jsxs3(
        "div",
        {
          ref,
          className: b3("inputContainer", { focused, disabled, error: Boolean(error) }),
          onClick,
          onMouseDown,
          onMouseUp,
          children: [
            /* @__PURE__ */ jsx4("div", { className: b3("addon"), children: leftAddon }),
            /* @__PURE__ */ jsxs3("div", { className: b3("inputRoot", { outerLabel, innerLabel }), children: [
              /* @__PURE__ */ jsx4("span", { className: b3("label", { innerLabel, active, disabled }), children: label }),
              /* @__PURE__ */ jsx4("div", { className: b3("input", { innerLabel, active }), children })
            ] }),
            /* @__PURE__ */ jsx4("div", { className: b3("addon"), children: rightAddon })
          ]
        }
      ),
      /* @__PURE__ */ jsxs3("div", { className: b3("caption", { error: Boolean(error), active: Boolean(error || hint) }), children: [
        error || hint,
        "\xA0"
      ] })
    ] });
  }
);

// src/components/input/Input.tsx
import { useMaskito } from "@maskito/react";

// src/components/input/components/base-input/BaseInput.tsx
import {
  forwardRef as forwardRef2,
  memo,
  useCallback,
  useRef as useRef2,
  useState as useState2
} from "react";

// src/components/layout/flex/Flex.tsx
import React6 from "react";

// src/components/layout/box/Box.tsx
import React4 from "react";

// src/components/layout/layout-config/spacing/spacing.ts
var generateSpacingStyles = (spacingProps) => {
  if (!spacingProps) return {};
  const { mr, ml, mt, mb, mx, my, m, pr, pl, pt, pb, px, py, p } = spacingProps;
  const styles = {};
  if (mr) styles.marginRight = mr;
  if (ml) styles.marginLeft = ml;
  if (mt) styles.marginTop = mt;
  if (mb) styles.marginBottom = mb;
  if (mx) {
    styles.marginLeft = mx;
    styles.marginRight = mx;
  }
  if (my) {
    styles.marginTop = my;
    styles.marginBottom = my;
  }
  if (m) styles.margin = m;
  if (pr) styles.paddingRight = pr;
  if (pl) styles.paddingLeft = pl;
  if (pt) styles.paddingTop = pt;
  if (pb) styles.paddingBottom = pb;
  if (px) {
    styles.paddingLeft = px;
    styles.paddingRight = px;
  }
  if (py) {
    styles.paddingTop = py;
    styles.paddingBottom = py;
  }
  if (p) styles.padding = p;
  return styles;
};

// src/components/layout/box/Box.tsx
import { jsx as jsx5 } from "react/jsx-runtime";
var b4 = block("box");
var Box = React4.forwardRef(function Box2({
  as,
  children,
  className = "",
  width,
  height,
  minWidth,
  minHeight,
  maxHeight,
  maxWidth,
  style: outerStyle,
  spacing,
  overflow,
  dataTestId,
  ...props
}, ref) {
  const Component = as || "div";
  const style = {
    width,
    height,
    minWidth,
    minHeight,
    maxHeight,
    maxWidth,
    ...generateSpacingStyles(spacing),
    ...outerStyle
  };
  return /* @__PURE__ */ jsx5(Component, { ...props, "data-test-id": dataTestId, style, ref, className: b4({ overflow }, className), children });
});

// src/components/layout/layout-config/LayoutContext.tsx
import { createContext, useContext, useMemo } from "react";

// src/components/layout/layout-config/breakpoints/breakpoints.ts
var breakpoints = {
  xxs: 480,
  xs: 576,
  sm: 768,
  md: 992,
  lg: 1200,
  xl: 1600
};
var breakpointsOrder = ["xxs", "xs", "sm", "md", "lg", "xl"];
var breakpointsByOrder = {
  xxs: 0,
  xs: 1,
  sm: 2,
  md: 3,
  lg: 4,
  xl: 5
};

// src/components/layout/layout-config/hooks/useCurrentActiveMediaQuery.tsx
import React5 from "react";
var mockMediaQueryList = {
  media: "",
  matches: false,
  onchange: () => {
  },
  addListener: () => {
  },
  removeListener: () => {
  },
  addEventListener: () => {
  },
  removeEventListener: () => {
  },
  dispatchEvent: (_) => true
};
var makeCurrentActiveMediaExpressions = (mediaToValue) => ({
  xxs: `(max-width: ${mediaToValue.xs - 1}px)`,
  xs: `(min-width: ${mediaToValue.xs}px) and (max-width: ${mediaToValue.sm - 1}px)`,
  sm: `(min-width: ${mediaToValue.sm}px) and (max-width: ${mediaToValue.md - 1}px)`,
  md: `(min-width: ${mediaToValue.md}px) and (max-width: ${mediaToValue.lg - 1}px)`,
  lg: `(min-width: ${mediaToValue.lg}px) and (max-width: ${mediaToValue.xl - 1}px)`,
  xl: `(min-width: ${mediaToValue.xl}px)`
});
var safeMatchMedia = (query) => {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return mockMediaQueryList;
  }
  return window.matchMedia(query);
};
var Queries = class {
  queryListsDecl = [];
  constructor(breakpointsMap) {
    const mediaToExpressionMap = makeCurrentActiveMediaExpressions(breakpointsMap);
    this.queryListsDecl = [
      // order important here
      ["xxs", safeMatchMedia(mediaToExpressionMap.xxs)],
      ["xs", safeMatchMedia(mediaToExpressionMap.xs)],
      ["sm", safeMatchMedia(mediaToExpressionMap.sm)],
      ["md", safeMatchMedia(mediaToExpressionMap.md)],
      ["lg", safeMatchMedia(mediaToExpressionMap.lg)],
      ["xl", safeMatchMedia(mediaToExpressionMap.xl)]
    ];
  }
  getCurrentActiveMedia() {
    const activeMedia = this.queryListsDecl.find(([_, queryList]) => queryList.matches);
    if (!activeMedia) {
      return "xxs";
    }
    return activeMedia[0];
  }
  addListeners(fn) {
    this.queryListsDecl.forEach(([_, queryList]) => queryList.addEventListener("change", fn));
  }
  removeListeners(fn) {
    this.queryListsDecl.forEach(([_, queryList]) => queryList.removeEventListener("change", fn));
  }
};
var useCurrentActiveMediaQuery = (breakpointsMap, initialBreakpoint = "lg") => {
  const [state, _setState] = React5.useState(initialBreakpoint);
  React5.useLayoutEffect(() => {
    const queries = new Queries(breakpointsMap);
    const setState = () => {
      _setState(queries.getCurrentActiveMedia());
    };
    queries.addListeners(setState);
    setState();
    return () => {
      queries.removeListeners(setState);
    };
  }, [breakpointsMap]);
  return state;
};

// src/components/layout/layout-config/utils.ts
var isMediaActiveFactory = (activeType) => (toCheck) => {
  return activeType in breakpointsByOrder ? breakpointsByOrder[activeType] - breakpointsByOrder[toCheck] >= 0 : false;
};
var getClosestMediaPropsFactory = (currentActive) => (medias = {}) => {
  if (!currentActive) {
    return void 0;
  }
  let candidate = currentActive;
  while (candidate) {
    if (medias[candidate]) {
      return medias[candidate];
    }
    candidate = breakpointsOrder[breakpointsByOrder[candidate] - 1];
  }
  return void 0;
};

// src/components/layout/layout-config/LayoutContext.tsx
import { jsx as jsx6 } from "react/jsx-runtime";
var LayoutContext = createContext(null);
var useLayoutContext = () => {
  const layoutContext = useContext(LayoutContext);
  if (!layoutContext) {
    throw Error("layoutContext is not reachable.");
  }
  return layoutContext;
};
var LayoutProvider = ({ children, initialMediaQuery }) => {
  const activeBreakpoint = useCurrentActiveMediaQuery(breakpoints, initialMediaQuery);
  const { isMediaActive, getClosestMediaProps } = useMemo(
    () => ({
      isMediaActive: isMediaActiveFactory(activeBreakpoint),
      getClosestMediaProps: getClosestMediaPropsFactory(activeBreakpoint)
    }),
    [activeBreakpoint]
  );
  return /* @__PURE__ */ jsx6(
    LayoutContext.Provider,
    {
      value: {
        isMediaActive,
        getClosestMediaProps,
        activeBreakpoint,
        breakpoints
      },
      children
    }
  );
};

// src/components/layout/flex/Flex.tsx
import { jsx as jsx7 } from "react/jsx-runtime";
var b5 = block("flex");
var Flex = React6.forwardRef(function Flex2(props, ref) {
  const {
    as: propsAs,
    className = "",
    direction,
    grow,
    basis,
    children,
    style,
    alignContent,
    alignItems,
    alignSelf,
    justifyContent,
    justifyItems,
    justifySelf,
    shrink,
    wrap,
    inline,
    gap,
    centerContent,
    dataTestId,
    ...restProps
  } = props;
  const as = propsAs || "div";
  const { getClosestMediaProps } = useLayoutContext();
  const applyMediaProps = (property) => typeof property === "object" && property !== null ? getClosestMediaProps(property) : property;
  return /* @__PURE__ */ jsx7(
    Box,
    {
      ...restProps,
      as,
      className: b5({ "center-content": centerContent, inline }, className),
      ref,
      style: {
        flexDirection: applyMediaProps(direction),
        flexGrow: grow === true ? 1 : grow,
        flexWrap: wrap === true ? "wrap" : wrap,
        flexBasis: basis,
        flexShrink: shrink,
        gap: applyMediaProps(gap),
        alignContent: applyMediaProps(alignContent),
        alignItems: applyMediaProps(alignItems),
        alignSelf: applyMediaProps(alignSelf),
        justifyContent: applyMediaProps(justifyContent),
        justifyItems: applyMediaProps(justifyItems),
        justifySelf: applyMediaProps(justifySelf),
        ...style
      },
      "data-test-id": dataTestId,
      children
    }
  );
});

// src/components/input/components/icons/CloseIcon.tsx
import { jsx as jsx8 } from "react/jsx-runtime";
var CloseIcon = () => {
  return /* @__PURE__ */ jsx8("svg", { width: "20", height: "20", viewBox: "0 0 20 20", fill: "none", xmlns: "http://www.w3.org/2000/svg", children: /* @__PURE__ */ jsx8(
    "path",
    {
      fillRule: "evenodd",
      clipRule: "evenodd",
      d: "M9.99996 18.3333C14.6023 18.3333 18.3333 14.6024 18.3333 9.99999C18.3333 5.39762 14.6023 1.66666 9.99996 1.66666C5.39759 1.66666 1.66663 5.39762 1.66663 9.99999C1.66663 14.6024 5.39759 18.3333 9.99996 18.3333ZM7.9419 7.05805C7.69782 6.81397 7.3021 6.81397 7.05802 7.05805C6.81394 7.30213 6.81394 7.69785 7.05802 7.94193L9.11608 9.99999L7.05802 12.058C6.81395 12.3021 6.81395 12.6979 7.05802 12.9419C7.3021 13.186 7.69783 13.186 7.94191 12.9419L9.99996 10.8839L12.058 12.9419C12.3021 13.186 12.6978 13.186 12.9419 12.9419C13.186 12.6979 13.186 12.3021 12.9419 12.058L10.8838 9.99999L12.9419 7.94193C13.186 7.69785 13.186 7.30213 12.9419 7.05805C12.6978 6.81397 12.3021 6.81397 12.058 7.05805L9.99996 9.11611L7.9419 7.05805Z"
    }
  ) });
};

// src/components/input/components/base-input/BaseInput.utils.ts
var generateInputEvent = (input, onChange) => {
  if (!input) return;
  const event = new Event("input", { bubbles: true });
  input.value = "";
  input.dispatchEvent(event);
};

// src/components/input/components/base-input/BaseInput.tsx
import { jsx as jsx9, jsxs as jsxs4 } from "react/jsx-runtime";
var b6 = block("base-input");
var BaseInput = memo(
  forwardRef2(
    ({
      // FormControlProps
      fullWidth,
      disabled,
      error,
      hint,
      label,
      labelType,
      leftAddon,
      rightAddon,
      dataTestId,
      wrapperProps,
      showFocus,
      // Input Props
      clear = false,
      onFocus,
      onBlur,
      onChange,
      onClear,
      onClick,
      onMouseDown,
      onMouseUp,
      onAnimationStart,
      value,
      defaultValue,
      readOnly,
      FormControlComponent,
      focusAfterClear = true,
      className,
      ...restProps
    }, ref) => {
      const uncontrolled = value === void 0;
      const inputRef = useRef2(null);
      const wrapperRef = useRef2(null);
      const [focused, setFocused] = useState2(false);
      const [stateValue, setStateValue] = useState2(defaultValue || "");
      const filled = Boolean(uncontrolled ? stateValue : value);
      const [autofilled, setAutofilled] = useState2(false);
      const clearButtonVisible = clear && filled && !disabled && !readOnly;
      const hasInnerLabel = label && labelType === "inner" || false;
      const handleInputFocus = useCallback(
        (event) => {
          if (!readOnly) {
            setFocused(true);
          }
          onFocus?.(event);
        },
        [onFocus, readOnly]
      );
      const handleInputBlur = useCallback(
        (event) => {
          setFocused(false);
          onBlur?.(event);
        },
        [onBlur]
      );
      const handleInputChange = useCallback(
        (event) => {
          onChange?.(event, { value: event.target.value, name: event.target.name });
          if (uncontrolled) {
            setStateValue(event.target.value);
          }
        },
        [onChange, uncontrolled]
      );
      const handleClear = useCallback(
        (event) => {
          event.stopPropagation();
          if (!clearButtonVisible) return;
          if (uncontrolled) {
            setStateValue("");
          } else {
            generateInputEvent(inputRef.current, handleInputChange);
          }
          onClear?.(event);
          if (inputRef.current && !focused && focusAfterClear) {
            inputRef.current.focus();
          }
        },
        [clearButtonVisible, focused, onClear, uncontrolled, focusAfterClear]
      );
      const handleFormControlClick = useCallback(
        (event) => {
          event.stopPropagation();
          onClick?.(event);
          if (inputRef.current) inputRef.current.focus();
        },
        [onClick]
      );
      const handleAnimationStart = useCallback(
        (event) => {
          onAnimationStart?.(event);
          setAutofilled(event.animationName.includes("start"));
        },
        [onAnimationStart]
      );
      const renderRightAddons = () => {
        const renderRightAddons2 = Boolean(clear || rightAddon);
        return renderRightAddons2 ? /* @__PURE__ */ jsxs4(Flex, { gap: 4, alignItems: "center", children: [
          clear ? /* @__PURE__ */ jsx9("button", { type: "button", onClick: handleClear, className: b6("clearIcon", { visible: clearButtonVisible }), children: /* @__PURE__ */ jsx9(CloseIcon, { "aria-label": "clear" }) }) : null,
          rightAddon
        ] }) : null;
      };
      if (!FormControlComponent) return null;
      return /* @__PURE__ */ jsx9(
        FormControlComponent,
        {
          ref: wrapperRef,
          fullWidth,
          filled: filled || autofilled || focused,
          disabled,
          focused: focused || showFocus,
          error,
          labelType,
          label,
          hint,
          onClick: handleFormControlClick,
          onMouseDown,
          onMouseUp,
          leftAddon,
          rightAddon: renderRightAddons(),
          ...wrapperProps,
          children: /* @__PURE__ */ jsx9(
            "input",
            {
              ...restProps,
              className: b6({ hasInnerLabel }, className),
              disabled,
              readOnly: readOnly ? readOnly : false,
              ref: mergeRefs([ref, inputRef]),
              onBlur: handleInputBlur,
              onFocus: handleInputFocus,
              onChange: handleInputChange,
              onAnimationStart: handleAnimationStart,
              value: uncontrolled ? stateValue : value,
              "aria-label": restProps["aria-label"] ?? (typeof label === "string" ? label : "bcc-input"),
              "data-test-id": dataTestId
            }
          )
        }
      );
    }
  )
);

// src/components/input/components/input-password/InputPassword.tsx
import { forwardRef as forwardRef3, memo as memo2, useCallback as useCallback2, useState as useState3 } from "react";

// src/components/input/components/icons/EyeCrossedIcon.tsx
import { jsx as jsx10, jsxs as jsxs5 } from "react/jsx-runtime";
var EyeCrossedIcon = () => {
  return /* @__PURE__ */ jsxs5("svg", { width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", xmlns: "http://www.w3.org/2000/svg", children: [
    /* @__PURE__ */ jsx10(
      "path",
      {
        fillRule: "evenodd",
        clipRule: "evenodd",
        d: "M19.4697 20.5303C19.1768 20.8232 18.7019 20.8232 18.409 20.5303L16.1871 18.3085C14.9739 18.7351 13.5832 19 12 19C5.52374 19 2.26819 14.5681 1.20827 12.7572C0.930577 12.2827 0.930577 11.7173 1.20827 11.2428C1.78052 10.2651 2.99277 8.52342 5.00635 7.12767L3.46967 5.59098C3.17678 5.29809 3.17678 4.82322 3.46967 4.53032C3.76256 4.23743 4.23744 4.23743 4.53033 4.53032L19.4697 19.4697C19.7626 19.7626 19.7626 20.2374 19.4697 20.5303ZM14.3128 16.4341C13.6212 16.7956 12.8345 17 12 17C9.23858 17 7 14.7614 7 12C7 11.1655 7.20441 10.3788 7.5659 9.68721C9.9549 12.0762 11.7393 13.8606 14.3128 16.4341Z",
        fill: "#9CA3AF"
      }
    ),
    /* @__PURE__ */ jsx10(
      "path",
      {
        fillRule: "evenodd",
        clipRule: "evenodd",
        d: "M16.434 14.3128C16.7955 13.6212 16.9999 12.8345 16.9999 12C16.9999 9.23858 14.7613 7 11.9999 7C11.1654 7 10.3787 7.20441 9.68711 7.5659L7.81274 5.69154C9.02597 5.26486 10.4167 5 11.9999 5C18.4761 5 21.7317 9.43192 22.7916 11.2428C23.0693 11.7173 23.0693 12.2827 22.7916 12.7572C22.2194 13.7349 21.0071 15.4766 18.9935 16.8723L16.434 14.3128ZM14.9999 12C14.9999 12.2687 14.9646 12.5292 14.8983 12.7771L11.2228 9.10162C11.4707 9.03534 11.7312 9 11.9999 9C13.6567 9 14.9999 10.3431 14.9999 12Z",
        fill: "#9CA3AF"
      }
    )
  ] });
};

// src/components/input/components/icons/EyeIcon.tsx
import { jsx as jsx11, jsxs as jsxs6 } from "react/jsx-runtime";
var EyeIcon = () => {
  return /* @__PURE__ */ jsxs6("svg", { width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", xmlns: "http://www.w3.org/2000/svg", children: [
    /* @__PURE__ */ jsx11(
      "path",
      {
        fillRule: "evenodd",
        clipRule: "evenodd",
        d: "M22.7917 11.2428C21.7318 9.43192 18.4763 5 12 5C5.52374 5 2.26819 9.43192 1.20827 11.2428C0.930577 11.7173 0.930577 12.2827 1.20827 12.7572C2.26819 14.5681 5.52374 19 12 19C18.4763 19 21.7318 14.5681 22.7917 12.7572C23.0694 12.2827 23.0694 11.7173 22.7917 11.2428ZM12 17C14.7614 17 17 14.7614 17 12C17 9.23858 14.7614 7 12 7C9.23858 7 7 9.23858 7 12C7 14.7614 9.23858 17 12 17Z",
        fill: "#9CA3AF"
      }
    ),
    /* @__PURE__ */ jsx11("circle", { cx: "12", cy: "12", r: "2", fill: "#9CA3AF" })
  ] });
};

// src/components/input/components/input-password/InputPassword.tsx
import { jsx as jsx12 } from "react/jsx-runtime";
var b7 = block("input-password");
var InputPassword = memo2(
  forwardRef3((props, ref) => {
    const [shown, setShown] = useState3(false);
    const toggleShown = useCallback2((e) => {
      e.stopPropagation();
      setShown((prev) => !prev);
    }, []);
    const EyeIconButton = () => {
      return /* @__PURE__ */ jsx12("button", { type: "button", onClick: toggleShown, className: b7("icon"), children: shown ? /* @__PURE__ */ jsx12(EyeCrossedIcon, {}) : /* @__PURE__ */ jsx12(EyeIcon, {}) });
    };
    return /* @__PURE__ */ jsx12(
      BaseInput,
      {
        ...props,
        ref,
        type: shown ? "text" : "password",
        FormControlComponent: BaseFormControl,
        rightAddon: EyeIconButton()
      }
    );
  })
);

// src/components/input/components/mask/presets/custom.ts
import {
  maskitoAddOnFocusPlugin,
  maskitoCaretGuard,
  maskitoPostfixPostprocessorGenerator,
  maskitoPrefixPostprocessorGenerator,
  maskitoRemoveOnBlurPlugin,
  maskitoWithPlaceholder
} from "@maskito/kit";
var getCustomPreset = ({
  value = /.*/,
  prefix = "",
  postfix = "",
  placeholder = "",
  mode = "shift"
}) => {
  const placeholderOptions = maskitoWithPlaceholder(placeholder);
  const custom = {
    mask: value,
    preprocessors: [...placeholderOptions.preprocessors],
    postprocessors: [
      maskitoPostfixPostprocessorGenerator(postfix),
      maskitoPrefixPostprocessorGenerator(prefix),
      ...placeholderOptions.postprocessors
    ],
    plugins: [
      ...placeholderOptions.plugins,
      maskitoAddOnFocusPlugin(prefix + postfix),
      maskitoRemoveOnBlurPlugin(prefix + postfix),
      maskitoCaretGuard((value2) => [prefix.length, value2.length - postfix.length])
    ],
    overwriteMode: mode
  };
  return custom;
};

// src/components/input/components/mask/option-getters/setCustomOptions.ts
var setCustomOptions = (props, options) => {
  const custom = getCustomPreset(props);
  mergeMaskOptions(options, custom);
};

// src/components/input/components/mask/presets/account.ts
import {
  maskitoAddOnFocusPlugin as maskitoAddOnFocusPlugin2,
  maskitoCaretGuard as maskitoCaretGuard2,
  maskitoRemoveOnBlurPlugin as maskitoRemoveOnBlurPlugin2,
  maskitoWithPlaceholder as maskitoWithPlaceholder2
} from "@maskito/kit";
var PLACEHOLDER = "KZ __ ____ ____ ____ ____";
var getAccountPreset = (props) => {
  const placeholderOptions = maskitoWithPlaceholder2(props?.placeholder ? PLACEHOLDER : "", true);
  const account = {
    mask: [
      "K",
      "Z",
      " ",
      ...new Array(2).fill(/\d/),
      " ",
      ...new Array(4).fill(/\d/),
      " ",
      ...new Array(4).fill(/\d/),
      " ",
      ...new Array(4).fill(/\d/),
      " ",
      ...new Array(4).fill(/\d/)
    ],
    postprocessors: [...placeholderOptions.postprocessors],
    preprocessors: [...placeholderOptions.preprocessors],
    plugins: [
      maskitoAddOnFocusPlugin2("KZ "),
      maskitoRemoveOnBlurPlugin2("KZ "),
      ...placeholderOptions.plugins,
      maskitoCaretGuard2((value, [from, to]) => [from === to ? "KZ ".length : 0, value.length])
    ],
    overwriteMode: props?.mode
  };
  return account;
};

// src/components/input/components/mask/presets/amount.ts
import { maskitoNumberOptionsGenerator } from "@maskito/kit";
var getAmountPreset = (props) => {
  const amount = maskitoNumberOptionsGenerator({
    decimalSeparator: " ,",
    thousandSeparator: " ",
    decimalPseudoSeparators: [".", "\u044E", "\u0431"],
    precision: props?.precision || 2,
    prefix: props?.prefix,
    postfix: props?.postfix
  });
  return {
    ...amount,
    overwriteMode: props?.mode
  };
};

// src/components/input/components/mask/presets/card.ts
import { maskitoWithPlaceholder as maskitoWithPlaceholder3 } from "@maskito/kit";
var PLACEHOLDER2 = "____ ____ ____ ____";
var getCardPreset = (props) => {
  const placeholderOptions = maskitoWithPlaceholder3(props?.placeholder ? PLACEHOLDER2 : "", true);
  const card = {
    ...placeholderOptions,
    mask: [
      ...new Array(4).fill(/\d/),
      " ",
      ...new Array(4).fill(/\d/),
      " ",
      ...new Array(4).fill(/\d/),
      " ",
      ...new Array(4).fill(/\d/)
    ],
    overwriteMode: props?.mode
  };
  return card;
};

// src/components/input/components/mask/presets/date.ts
import { maskitoDateOptionsGenerator, maskitoWithPlaceholder as maskitoWithPlaceholder4 } from "@maskito/kit";
var getDatePreset = ({ dateMode = "dd/mm/yyyy", separator = ".", ...props }) => {
  const placeholder = props?.placeholder ? dateMode.replaceAll("/", separator) : "";
  const placeholderOptions = maskitoWithPlaceholder4(placeholder, true);
  const dateOptions = maskitoDateOptionsGenerator({
    mode: dateMode,
    separator,
    min: props?.min,
    max: props?.max
  });
  const date = {
    ...dateOptions,
    plugins: placeholderOptions.plugins.concat(dateOptions.plugins || []),
    preprocessors: [...placeholderOptions.preprocessors, ...dateOptions.preprocessors],
    postprocessors: [...dateOptions.postprocessors, ...placeholderOptions.postprocessors]
  };
  return date;
};

// src/components/input/components/mask/presets/dateTime.ts
import { maskitoDateTimeOptionsGenerator, maskitoWithPlaceholder as maskitoWithPlaceholder5 } from "@maskito/kit";
var getDateTimePreset = ({
  dateMode = "dd/mm/yyyy",
  timeMode = "HH:MM",
  separator = ".",
  ...props
}) => {
  const placeholder = props?.placeholder ? dateMode?.concat(`, ${timeMode}`).replaceAll("/", separator) : "";
  const placeholderOptions = maskitoWithPlaceholder5(placeholder, true);
  const dateTimeOptions = maskitoDateTimeOptionsGenerator({
    dateMode,
    timeMode,
    dateSeparator: separator,
    min: props?.min,
    max: props?.max
  });
  const dateTime = {
    ...dateTimeOptions,
    plugins: placeholderOptions.plugins.concat(dateTimeOptions.plugins || []),
    preprocessors: [...placeholderOptions.preprocessors, ...dateTimeOptions.preprocessors],
    postprocessors: [...dateTimeOptions.postprocessors, ...placeholderOptions.postprocessors]
  };
  return dateTime;
};

// src/components/input/components/mask/presets/numbers.ts
import {
  maskitoAddOnFocusPlugin as maskitoAddOnFocusPlugin3,
  maskitoCaretGuard as maskitoCaretGuard3,
  maskitoPostfixPostprocessorGenerator as maskitoPostfixPostprocessorGenerator2,
  maskitoPrefixPostprocessorGenerator as maskitoPrefixPostprocessorGenerator2,
  maskitoRemoveOnBlurPlugin as maskitoRemoveOnBlurPlugin3,
  maskitoWithPlaceholder as maskitoWithPlaceholder6
} from "@maskito/kit";
var getNumbersPreset = ({ prefix = "", postfix = "", placeholder = "", mode = "shift" }) => {
  const placeholderOptions = maskitoWithPlaceholder6(placeholder, true);
  const numbers = {
    mask: ({ value }) => {
      const digitsMask = Array.from(value.replaceAll(postfix, "")).map(() => /\d/);
      if (!digitsMask.length) {
        return [/\d/];
      }
      return constructMask(prefix, digitsMask, postfix);
    },
    preprocessors: [...placeholderOptions.preprocessors],
    postprocessors: [
      maskitoPrefixPostprocessorGenerator2(prefix),
      maskitoPostfixPostprocessorGenerator2(postfix),
      removeRedundantLeadingZeros,
      ...placeholderOptions.postprocessors
    ],
    plugins: [
      maskitoAddOnFocusPlugin3(prefix + postfix),
      maskitoRemoveOnBlurPlugin3(prefix + postfix),
      maskitoCaretGuard3((value, [from, to]) => [from === to ? prefix.length : 0, value.length]),
      ...placeholderOptions.plugins
    ],
    overwriteMode: mode
  };
  return numbers;
};
function constructMask(prefix, digitsMask, postfix) {
  if (prefix && postfix) {
    return [prefix, ...digitsMask, postfix];
  } else if (prefix) {
    return [prefix, ...digitsMask];
  } else if (postfix) {
    return [...digitsMask, postfix];
  } else {
    return [...digitsMask];
  }
}
var removeRedundantLeadingZeros = ({ value, selection }, _) => {
  const [from, to] = selection;
  const noRepeatedLeadingZeroesValue = value.replace(/^0+/, "0");
  const removedCharacters = value.length - noRepeatedLeadingZeroesValue.length;
  return {
    value: noRepeatedLeadingZeroesValue,
    // User types "000000" => 0|
    selection: [Math.max(from - removedCharacters, 0), Math.max(to - removedCharacters, 0)]
  };
};

// src/components/input/components/mask/presets/phone.ts
import { maskitoUpdateElement } from "@maskito/core";
import {
  maskitoCaretGuard as maskitoCaretGuard4,
  maskitoEventHandler,
  maskitoPrefixPostprocessorGenerator as maskitoPrefixPostprocessorGenerator3,
  maskitoWithPlaceholder as maskitoWithPlaceholder7
} from "@maskito/kit";
var PLACEHOLDER3 = "+\u2000 (\u2000\u2000\u2000) ___-__-__";
var COUTRY_CODE = "7";
var getPhonePreset = (props) => {
  const placeholder = props?.placeholder ? PLACEHOLDER3 : "";
  const { removePlaceholder, plugins, ...placeholderOptions } = maskitoWithPlaceholder7(placeholder);
  const phone = {
    mask: ["+", COUTRY_CODE, " ", "(", /\d/, /\d/, /\d/, ")", " ", /\d/, /\d/, /\d/, "-", /\d/, /\d/, "-", /\d/, /\d/],
    preprocessors: [...placeholderOptions.preprocessors, createCompletePhoneInsertionPreprocessor()],
    postprocessors: [maskitoPrefixPostprocessorGenerator3("+7"), ...placeholderOptions.postprocessors],
    plugins: [
      ...plugins,
      maskitoEventHandler("focus", (element) => {
        const initialValue = element.value || `+${COUTRY_CODE} (`;
        maskitoUpdateElement(element, initialValue + PLACEHOLDER3.slice(initialValue.length));
      }),
      maskitoEventHandler("blur", (element) => {
        const cleanValue = removePlaceholder(element.value);
        maskitoUpdateElement(element, cleanValue === `+${COUTRY_CODE}` ? "" : cleanValue);
      }),
      maskitoCaretGuard4((value, [from, to]) => [from === to ? `+${COUTRY_CODE} `.length : 0, value.length])
    ],
    overwriteMode: props?.mode
  };
  return phone;
};
function createCompletePhoneInsertionPreprocessor() {
  const trimPrefix = (value) => value.replace(/^(\+?7?\s?8?)\s?/, "");
  const countDigits = (value) => value.replaceAll(/\D/g, "").length;
  return ({ elementState, data }) => {
    const { value, selection } = elementState;
    return {
      elementState: {
        selection,
        value: countDigits(value) > 11 ? trimPrefix(value) : value
      },
      data: countDigits(data) >= 11 ? trimPrefix(data) : data
    };
  };
}

// src/components/input/components/mask/option-getters/setPresetOptions.ts
var setPresetOptions = (props, options) => {
  const presets = getMaskPresetMap(props);
  mergeMaskOptions(options, presets[props.value]);
};
function getMaskPresetMap(props) {
  const MaskPresetOptions = {
    account: getAccountPreset(props),
    amount: getAmountPreset(props),
    card: getCardPreset(props),
    date: getDatePreset(props),
    dateTime: getDateTimePreset(props),
    numbers: getNumbersPreset(props),
    phone: getPhonePreset(props)
  };
  return MaskPresetOptions;
}

// src/components/input/components/mask/utils.ts
var defaultMaskitoOptions = {
  mask: /.*/,
  preprocessors: [],
  postprocessors: [],
  plugins: [],
  overwriteMode: "shift"
};
var propsToOptions = (props) => {
  if (!props) return defaultMaskitoOptions;
  const options = structuredClone(defaultMaskitoOptions);
  if (isValidInputMaskOption(props)) {
    setPresetOptions(props, options);
  } else {
    setCustomOptions(props, options);
  }
  return options;
};
var INPUT_MASK_OPTIONS_ARRAY = [
  "phone",
  "numbers",
  "date",
  "dateTime",
  "card",
  "account",
  "amount"
];
function isValidInputMaskOption(props) {
  return INPUT_MASK_OPTIONS_ARRAY.includes(props?.value);
}
var mergeMaskOptions = (opt1, opt2) => {
  opt1.mask = opt2.mask;
  opt1.preprocessors = [...opt1.preprocessors || [], ...opt2.preprocessors || []];
  opt1.postprocessors = [...opt1.postprocessors || [], ...opt2.postprocessors || []];
  opt1.plugins = [...opt1.plugins || [], ...opt2.plugins || []];
  opt1.overwriteMode = opt2.overwriteMode;
};

// src/components/input/Input.tsx
import { jsx as jsx13 } from "react/jsx-runtime";
var Input = memo3(
  forwardRef4(({ mask, type, ...props }, ref) => {
    const withMask = Boolean(mask?.value);
    const isPassword = type === "password";
    if (withMask) return /* @__PURE__ */ jsx13(MaskedInput, { ...props, mask });
    if (isPassword) return /* @__PURE__ */ jsx13(InputPassword, { ...props });
    return /* @__PURE__ */ jsx13(BaseInput, { ...props, ref, FormControlComponent: BaseFormControl });
  })
);
var MaskedInput = memo3(
  forwardRef4(({ mask, ...props }, ref) => {
    const maskOptions = useMemo2(() => propsToOptions(mask), [mask?.value]);
    const inputRef = useMaskito({ options: maskOptions });
    const mergedRef = mergeRefs([ref, inputRef]);
    return /* @__PURE__ */ jsx13(BaseInput, { ...props, ref: mergedRef, FormControlComponent: BaseFormControl });
  })
);

// src/components/textarea/Textarea.tsx
import React9, { useCallback as useCallback3, useEffect as useEffect2, useRef as useRef3 } from "react";
import { jsx as jsx14, jsxs as jsxs7 } from "react/jsx-runtime";
var b8 = block("textarea");
var Textarea = React9.forwardRef((props, ref) => {
  const {
    className,
    classNameWrapper,
    label,
    disabled,
    labelType = "outer",
    error,
    hint,
    rows,
    fullWidth,
    placeholder,
    maxLength,
    dataTestId,
    showLettersLimit = true,
    value,
    onChange,
    name = "",
    ...rest
  } = props;
  const textareaRef = useRef3(null);
  const isControlled = typeof value !== "undefined";
  const currentValue = isControlled ? value : textareaRef.current?.value;
  const [focus] = useFocus(textareaRef);
  const [textCount, setTextCount] = React9.useState(currentValue?.length || 0);
  const handleChange = useCallback3(
    (e) => {
      if (!isControlled) {
        setTextCount(e.target.value.length);
      }
      onChange?.(e, { value: e.target.value, name });
    },
    [onChange, name, isControlled]
  );
  useEffect2(() => {
    setTextCount(currentValue?.length || 0);
  }, [currentValue]);
  const isError = Boolean(error);
  const isInnerLabelCollapsed = focus || Boolean(currentValue);
  const isCaptionActive = Boolean(error || hint || maxLength && showLettersLimit);
  const showLimiter = showLettersLimit && typeof maxLength !== "undefined";
  return /* @__PURE__ */ jsxs7("div", { className: b8("container", { fullWidth }), "data-test-id": props.dataTestId, children: [
    /* @__PURE__ */ jsx14("label", { className: b8("outer-label", { show: labelType === "outer" }), children: label }),
    /* @__PURE__ */ jsxs7("div", { className: b8("wrapper", { focus, error: isError, disabled }, classNameWrapper), children: [
      /* @__PURE__ */ jsx14(
        "label",
        {
          className: b8("inner-label", {
            show: labelType === "inner",
            collapsed: isInnerLabelCollapsed
          }),
          children: label
        }
      ),
      /* @__PURE__ */ jsx14(
        "textarea",
        {
          className: b8("textarea", { labelType, error: isError, disabled }, className),
          ref: mergeRefs([ref, textareaRef]),
          ...rest,
          value,
          onChange: handleChange,
          rows,
          disabled,
          maxLength,
          placeholder: labelType === "inner" ? void 0 : placeholder
        }
      )
    ] }),
    /* @__PURE__ */ jsxs7(
      "div",
      {
        className: b8("caption", {
          error: isError,
          active: isCaptionActive
        }),
        children: [
          /* @__PURE__ */ jsxs7("div", { className: b8("caption_text"), children: [
            error || hint,
            "\xA0"
          ] }),
          /* @__PURE__ */ jsxs7("div", { className: b8("limiter", { hidden: !showLimiter, disabled }), children: [
            textCount,
            "/",
            maxLength
          ] })
        ]
      }
    )
  ] });
});
Textarea.displayName = "Textarea";

// src/components/slider/Slider.tsx
import React12 from "react";
import debounce from "lodash/debounce";

// src/components/slider/BaseSlider/BaseSlider.tsx
import React10 from "react";
import Slider from "rc-slider";
import { jsx as jsx15 } from "react/jsx-runtime";
var b9 = block("base-slider");
var BaseSlider = React10.forwardRef(function BaseSlider2({ stateModifiers, ...otherProps }, ref) {
  return /* @__PURE__ */ jsx15(
    Slider,
    {
      ...otherProps,
      ref,
      className: b9(stateModifiers),
      pushable: false,
      dots: false,
      keyboard: true,
      classNames: {
        handle: b9("handle", stateModifiers),
        rail: b9("rail", stateModifiers),
        track: b9("track", stateModifiers)
      }
    }
  );
});

// src/components/slider/SliderTooltip/SliderTooltip.tsx
import React11 from "react";

// src/components/slider/SliderTooltip/SliderTooltipPin.tsx
import { jsx as jsx16 } from "react/jsx-runtime";
var SliderTooltipPin = ({ className }) => /* @__PURE__ */ jsx16("span", { className, children: /* @__PURE__ */ jsx16("svg", { width: "12", height: "6", viewBox: "0 0 12 6", fill: "none", xmlns: "http://www.w3.org/2000/svg", children: /* @__PURE__ */ jsx16(
  "path",
  {
    d: "M5.99996 5.02325C5.99996 5.02325 7.7674 -1.90735e-06 11.3023 -1.90735e-06H0.697632C4.23252 -1.90735e-06 5.99996 5.02325 5.99996 5.02325Z",
    fill: "currentColor"
  }
) }) });

// src/components/slider/SliderTooltip/SliderTooltip.tsx
import { jsx as jsx17, jsxs as jsxs8 } from "react/jsx-runtime";
var b10 = block("slider-tooltip");
var SliderTooltip = ({ value, className, style, stateModifiers }) => {
  const preventAction = React11.useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);
  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events,jsx-a11y/no-static-element-interactions
    /* @__PURE__ */ jsx17(
      "div",
      {
        className: b10(stateModifiers, className),
        style,
        onClick: preventAction,
        onMouseDown: preventAction,
        onTouchStart: preventAction,
        children: /* @__PURE__ */ jsxs8("div", { className: b10("card", stateModifiers), children: [
          value,
          stateModifiers.disabled && //use this element to prevent crossing effect
          /* @__PURE__ */ jsx17(SliderTooltipPin, { className: b10("pin", { background: true }) }),
          /* @__PURE__ */ jsx17(SliderTooltipPin, { className: b10("pin") })
        ] })
      }
    )
  );
};

// src/components/slider/constants.ts
var CLEAR_MARK_STYLE = { left: "", right: "", transform: "" };

// src/components/slider/utils.ts
function prepareSingleValue({ value, min, max }) {
  if (typeof value === "undefined" || value < min) {
    return min;
  } else if (value > max) {
    return max;
  }
  return value;
}
function prepareArrayValue({ value = [], min = 0, max = 100 }) {
  return [prepareSingleValue({ max, min, value: value[0] }), prepareSingleValue({ max, min, value: value[1] })].sort(
    (v1, v2) => v1 - v2
  );
}
function calculateInfoPoints({ count = 0, max, min }) {
  if (max === min) {
    return [min];
  }
  if (count > 2) {
    const points = [];
    const step = Math.abs(max - min) / (count - 1);
    for (let i = 0; i < count; i++) {
      points.push(Math.round((min + step * i) * 100) / 100);
    }
    return points;
  }
  return [min, max];
}
function createMarks(points) {
  const marks = {};
  const lastIndex = points.length - 1;
  points.forEach((point, i) => {
    if (i === 0) {
      marks[point] = { label: point, style: CLEAR_MARK_STYLE };
    } else if (i === lastIndex) {
      marks[point] = { label: point, style: CLEAR_MARK_STYLE };
    } else {
      marks[point] = point;
    }
  });
  return marks;
}
function prepareSliderInnerState({
  max = 100,
  min = 0,
  availableValues,
  defaultValue,
  marksCount,
  step,
  value
}) {
  const state = {
    value,
    defaultValue,
    range: false,
    max,
    min,
    marks: void 0,
    step
  };
  if (max < min) {
    state.max = min;
    state.min = max;
  }
  if (availableValues && availableValues.length > 0) {
    state.step = null;
    const sortedAvailableValues = Array.from(new Set(availableValues)).sort((v1, v2) => v1 - v2);
    state.min = sortedAvailableValues[0];
    state.max = sortedAvailableValues[sortedAvailableValues.length - 1];
    state.marks = createMarks(sortedAvailableValues);
  } else {
    state.marks = createMarks(calculateInfoPoints({ count: marksCount, max, min }));
  }
  if (value === void 0) {
    const isArray = Array.isArray(defaultValue);
    state.range = isArray;
    state.defaultValue = isArray ? prepareArrayValue({
      min: state.min,
      max: state.max,
      value: defaultValue
    }) : prepareSingleValue({
      min: state.min,
      max: state.max,
      value: defaultValue
    });
  } else {
    const isArray = Array.isArray(value);
    state.range = isArray;
    state.value = isArray ? prepareArrayValue({ min: state.min, max: state.max, value }) : prepareSingleValue({ min: state.min, max: state.max, value });
  }
  return state;
}

// src/components/slider/Slider.tsx
import { jsx as jsx18, jsxs as jsxs9 } from "react/jsx-runtime";
var b11 = block("slider");
var Slider2 = React12.forwardRef(function Slider3({
  value,
  defaultValue = 0,
  size = "s",
  min = 0,
  max = 100,
  step = 1,
  marksCount = 2,
  availableValues,
  hasTooltip = false,
  hasIndicator = false,
  error = false,
  disabled = false,
  debounceDelay = 0,
  onBlur,
  onUpdate,
  onUpdateComplete,
  onFocus,
  autoFocus = false,
  tabIndex,
  "aria-label": ariaLabelForHandle,
  "aria-labelledby": ariaLabelledByForHandle
}, ref) {
  const handleUpdate = React12.useCallback(
    debounce((changedValue) => onUpdate?.(changedValue), debounceDelay),
    [onUpdate, debounceDelay]
  );
  const handleUpdateComplete = React12.useCallback(
    debounce((changedValue) => onUpdateComplete?.(changedValue), debounceDelay),
    [onUpdateComplete, debounceDelay]
  );
  React12.useEffect(() => {
    return () => {
      handleUpdate.cancel();
      handleUpdateComplete.cancel();
    };
  }, [handleUpdate, handleUpdateComplete]);
  const innerState = prepareSliderInnerState({
    availableValues,
    defaultValue,
    marksCount,
    max,
    min,
    step,
    value
  });
  const stateModifiers = {
    size,
    error: error && !disabled,
    disabled,
    hasTooltip: Boolean(hasTooltip),
    hasIndicator,
    rtl: false
  };
  return /* @__PURE__ */ jsxs9("div", { className: b11(null), ref, children: [
    /* @__PURE__ */ jsx18("div", { className: b11("top", { size, hasTooltip }) }),
    /* @__PURE__ */ jsx18(
      BaseSlider,
      {
        value: innerState.value,
        defaultValue: innerState.defaultValue,
        min: innerState.min,
        max: innerState.max,
        step: innerState.step,
        range: innerState.range,
        marks: innerState.marks,
        disabled,
        onBlur,
        onFocus,
        onChange: handleUpdate,
        onChangeComplete: handleUpdateComplete,
        stateModifiers,
        autoFocus,
        tabIndex,
        handleRender: hasTooltip ? (originHandle, handleProps) => {
          const styleProp = stateModifiers.rtl ? "right" : "left";
          return /* @__PURE__ */ jsxs9(React12.Fragment, { children: [
            originHandle,
            /* @__PURE__ */ jsx18(
              SliderTooltip,
              {
                value: handleProps.value,
                className: b11("tooltip"),
                style: {
                  insetInlineStart: originHandle.props.style?.[styleProp]
                },
                stateModifiers
              }
            )
          ] });
        } : void 0,
        reverse: stateModifiers.rtl,
        ariaLabelForHandle,
        ariaLabelledByForHandle
      }
    )
  ] });
});
Slider2.displayName = "Slider";

// src/components/card/Card.tsx
import { jsx as jsx19 } from "react/jsx-runtime";
var b12 = block("card");
var Card = ({
  children,
  size = "m",
  type = "primary",
  width = "100%",
  height = "100%",
  maxWidth,
  autoCenter = false
}) => {
  return /* @__PURE__ */ jsx19(
    "div",
    {
      className: b12("wrapper", {
        [`size-${size}`]: true,
        [type]: true,
        autocenter: autoCenter
      }),
      style: {
        width,
        height,
        maxWidth
      },
      children
    }
  );
};

// src/components/typography/components/title/Title.tsx
import { forwardRef as forwardRef5 } from "react";

// src/components/typography/hooks/useSkeleton.tsx
import { useCallback as useCallback4, useEffect as useEffect3, useRef as useRef4, useState as useState4 } from "react";

// src/components/skeleton/Skeleton.tsx
import { jsx as jsx20 } from "react/jsx-runtime";
var b13 = block("skeleton");
var Skeleton = ({
  visible,
  animate = true,
  dataTestId,
  children,
  className = ""
}) => {
  if (visible) {
    return /* @__PURE__ */ jsx20("div", { className: b13({ animate }, className), "data-test-id": dataTestId, children });
  }
  return /* @__PURE__ */ jsx20("div", { "data-test-id": dataTestId, children });
};

// src/components/typography/hooks/useSkeleton.tsx
import { jsx as jsx21 } from "react/jsx-runtime";
var b14 = block("use-skeleton");
var getLineCount = (el) => {
  const characters = el.textContent.split("");
  el.textContent = "";
  let lastRegisteredTextHeight = 0;
  let lines = 0;
  for (let i = 0; i < characters.length; i++) {
    el.textContent += characters[i];
    const currentTextHeight = el.offsetHeight;
    if (currentTextHeight > lastRegisteredTextHeight) {
      lines++;
      lastRegisteredTextHeight = currentTextHeight;
    }
  }
  return lines;
};
function useSkeleton(showSkeleton, skeletonProps) {
  const [skeletonParams, setSkeletonParams] = useState4(null);
  const textRef = useRef4(null);
  const isRowNumber = typeof skeletonProps?.rows === "number";
  const isRowArray = Array.isArray(skeletonProps?.rows);
  const updateSkeletonParams = useCallback4(() => {
    if (showSkeleton && textRef.current) {
      const element = textRef.current;
      const style = getComputedStyle(element);
      const textHeight = element.offsetHeight;
      const fontSize = parseInt(style.fontSize, 10);
      let rows = getLineCount(element);
      const lineHeight = textHeight / rows;
      if (isRowNumber) {
        rows = skeletonProps?.rows;
      }
      if (isRowArray) {
        rows = skeletonProps?.rows?.length;
      }
      const gap = skeletonProps?.gap ?? "0px";
      setSkeletonParams((pv) => {
        if (!pv || pv.height !== textHeight || pv.rows !== rows) {
          const params = {
            height: textHeight,
            rows: rows || 1,
            fontSize: `${fontSize}px`,
            gap: typeof gap === "number" ? `${gap}px` : gap,
            lineHeight
          };
          return params;
        }
        return pv;
      });
    } else {
      setSkeletonParams(null);
    }
  }, [showSkeleton, skeletonProps?.rows]);
  useEffect3(() => {
    const timeoutId = setTimeout(updateSkeletonParams, 0);
    return () => clearTimeout(timeoutId);
  }, [showSkeleton, skeletonProps?.rows, updateSkeletonParams]);
  const renderSkeleton = useCallback4(
    (props) => {
      if (showSkeleton && skeletonParams) {
        const { rows, height, fontSize, gap, lineHeight } = skeletonParams;
        const skeletonRows = isRowArray ? skeletonProps?.rows : Array(rows).fill(null).map((_, i) => i);
        const isOneRow = skeletonRows.length === 1;
        console.log({ isOneRow, skeletonRows, rows, height, fontSize, gap, lineHeight });
        return /* @__PURE__ */ jsx21("div", { className: props.wrapperClassName, "data-test-id": props.dataTestId, children: skeletonRows.map((row, i) => /* @__PURE__ */ jsx21(
          "div",
          {
            className: b14("row"),
            style: {
              width: isRowArray ? row?.width : "100%",
              height: `${lineHeight}px`
            },
            children: /* @__PURE__ */ jsx21(Skeleton, { visible: true, className: b14(), children: /* @__PURE__ */ jsx21("div", { style: { height: isOneRow ? height : fontSize } }) })
          },
          row?.id ? row?.id : i
        )) });
      }
      return null;
    },
    [showSkeleton, skeletonParams, skeletonProps]
  );
  return { renderSkeleton, textRef };
}

// src/components/typography/components/title/Title.tsx
import { jsx as jsx22 } from "react/jsx-runtime";
var b15 = block("typography-title");
var Title = forwardRef5(
  ({
    dataTestId,
    tag: Component = "div",
    weight = "regular",
    children,
    skeletonProps,
    showSkeleton,
    isMobileView,
    rowLimit = "none",
    className,
    ...restProps
  }, ref) => {
    const { renderSkeleton, textRef } = useSkeleton(showSkeleton, { ...skeletonProps });
    const { activeBreakpoint } = useLayoutContext();
    const isHeader = Component.includes("h");
    const isAcceptMobileStyle = isMobileView === void 0 ? breakpointsOrder.slice(0, 3).includes(activeBreakpoint) : isMobileView;
    const isDesktopComponent = isAcceptMobileStyle && isHeader;
    const skeleton = renderSkeleton({
      dataTestId
    });
    if (skeleton) {
      return skeleton;
    }
    return /* @__PURE__ */ jsx22(
      Component,
      {
        className: b15(
          {
            title: isDesktopComponent ? Component + "_mobile" : Component,
            color: "primary",
            [`rowLimit_${rowLimit}`]: Boolean(rowLimit)
          },
          className
        ),
        ref: mergeRefs([ref, textRef]),
        ...restProps,
        children
      }
    );
  }
);

// src/components/typography/components/paragraph/Paragraph.tsx
import { forwardRef as forwardRef6 } from "react";
import { jsx as jsx23 } from "react/jsx-runtime";
var b16 = block("typography-paragraph");
var Paragraph = forwardRef6(
  ({
    tag: Component = "span",
    weight,
    monospaceNumbers = false,
    view,
    className,
    dataTestId,
    children,
    rowLimit = "none",
    showSkeleton,
    skeletonProps,
    decoration,
    ...restProps
  }, ref) => {
    const { renderSkeleton, textRef } = useSkeleton(showSkeleton, skeletonProps);
    const skeleton = renderSkeleton({
      wrapperClassName: b16({
        paragraphWithMargins: Component === "p"
      }),
      dataTestId
    });
    if (skeleton) {
      return skeleton;
    }
    return /* @__PURE__ */ jsx23(
      Component,
      {
        className: b16(
          {
            paragraph: Component === "p",
            paragraphWithMargins: Component === "p",
            monospace: monospaceNumbers,
            [decoration || ""]: true,
            [view || ""]: true,
            [weight || ""]: true,
            [`rowLimit_${rowLimit}`]: Boolean(rowLimit)
          },
          className
        ),
        ref: mergeRefs([ref, textRef]),
        ...restProps,
        children
      }
    );
  }
);

// src/components/typography/components/caption/Caption.tsx
import { forwardRef as forwardRef7 } from "react";
import { jsx as jsx24 } from "react/jsx-runtime";
var b17 = block("typography-caption");
var Caption = forwardRef7(
  ({
    tag: Component = "span",
    monospaceNumbers = false,
    weight,
    view,
    className,
    dataTestId,
    children,
    rowLimit = "none",
    showSkeleton,
    skeletonProps,
    decoration,
    ...restProps
  }, ref) => {
    const { renderSkeleton, textRef } = useSkeleton(showSkeleton, skeletonProps);
    const skeleton = renderSkeleton({
      wrapperClassName: b17({
        paragraphWithMargins: Component === "p"
      }),
      dataTestId
    });
    if (skeleton) {
      return skeleton;
    }
    return /* @__PURE__ */ jsx24(
      Component,
      {
        className: b17(
          {
            paragraph: Component === "p",
            paragraphWithMargins: Component === "p",
            monospace: monospaceNumbers,
            [view || ""]: true,
            [decoration || ""]: true,
            [`rowLimit_${rowLimit}`]: Boolean(rowLimit)
          },
          className
        ),
        ref: mergeRefs([ref, textRef]),
        ...restProps,
        children
      }
    );
  }
);

// src/components/typography/Typography.tsx
var Typography = {
  Title,
  Paragraph,
  Caption
};

// src/components/select/Select.tsx
import { memo as memo9, useCallback as useCallback7, useEffect as useEffect10, useId as useId2, useMemo as useMemo3, useRef as useRef7, useState as useState10 } from "react";

// src/components/dropdown/Dropdown.tsx
import React19, { forwardRef as forwardRef8, memo as memo6, useId, useRef as useRef5 } from "react";

// src/hooks/useClickOutside.ts
import { useEffect as useEffect4 } from "react";
var useClickOutside = (ref, handler, excludes) => {
  useEffect4(() => {
    const listener = (event) => {
      if (!ref.current || ref.current.contains(event.target)) return;
      if (excludes) {
        for (const excludedElement of excludes) {
          if (excludedElement?.contains(event.target)) return;
        }
      }
      handler?.(event);
    };
    document.addEventListener("click", listener, { capture: true });
    return () => document.removeEventListener("click", listener, { capture: true });
  }, [ref, handler, excludes]);
};

// src/components/dropdown/components/dropdown-relative-container/DropdownRelativeContainer.tsx
import { memo as memo4 } from "react";
import { jsx as jsx25 } from "react/jsx-runtime";
var b18 = block("dropdown-relative-container");
var DropdownRelativeContainer = memo4(({ children, withRelativeContainer = true, className, style }) => {
  if (!withRelativeContainer) return children;
  return /* @__PURE__ */ jsx25("div", { className: b18("", className), style, children });
});

// src/components/dropdown/components/portal/index.tsx
import { memo as memo5, useEffect as useEffect5, useState as useState5 } from "react";
import { createPortal } from "react-dom";
var DropdownPortal = memo5(({ children, usePortal, portalContainer }) => {
  const [mounted, setMounted] = useState5(false);
  useEffect5(() => setMounted(true), []);
  if (!usePortal) return children;
  if (!mounted) return null;
  const PortalContainer = portalContainer || document.body;
  return createPortal(children, PortalContainer);
});

// src/components/dropdown/hooks/useBooleanValueWithDelay.ts
import React17, { useEffect as useEffect6, useState as useState6 } from "react";
var useBooleanValueWithDelay = ({ value, delay = 0 }) => {
  const [bool, setBool] = useState6(value);
  const timeoutRef = React17.useRef(null);
  useEffect6(() => {
    if (value) {
      setBool(true);
    } else {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        setBool(false);
      }, delay);
    }
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, delay]);
  return bool;
};

// src/components/dropdown/hooks/useCalculateTargetPosition.ts
import { useEffect as useEffect7, useState as useState7 } from "react";
var getDropdownAnchorElement = (targetId, uid) => targetId ? document.getElementById(targetId) : document.querySelector(`[data-bcc-dropdown-anchor="${uid}"]`);
var useCalculateTargetPosition = ({
  isOpen,
  targetId,
  position,
  dropDownRef,
  matchAnchorWidth,
  uid,
  offset,
  offsetLeft,
  offsetRight
}) => {
  const [dropdownPositionStyle, setDropdownPositionStyle] = useState7({});
  useEffect7(() => {
    if (!isOpen) return;
    const anchor = getDropdownAnchorElement(targetId, uid);
    const dropdown = dropDownRef.current;
    if (!anchor || !dropdown) return;
    const update = () => {
      const rect = anchor.getBoundingClientRect();
      const parent = dropdown.offsetParent;
      const parentRect = parent?.getBoundingClientRect();
      const width = matchAnchorWidth ? rect.width - offsetLeft - offsetRight : dropdown.offsetWidth;
      const availableBelow = window.innerHeight - rect.bottom - offset - 8;
      const availableAbove = rect.top - offset - 8;
      const above = dropdown.scrollHeight > availableBelow && availableAbove > availableBelow;
      const maxHeight = Math.max(0, above ? availableAbove : availableBelow);
      const height = Math.min(dropdown.scrollHeight, maxHeight);
      const top = above ? rect.top - offset - height : rect.bottom + offset;
      let left = position === "center" ? rect.left + (rect.width - width) / 2 : position === "end" ? rect.right - width - offsetRight : rect.left + offsetLeft;
      left = Math.max(8, Math.min(left, window.innerWidth - width - 8));
      setDropdownPositionStyle({
        top: `${top - (parentRect?.top ?? -window.scrollY) + (parent?.scrollTop ?? 0) - (parent?.clientTop ?? 0)}px`,
        left: `${left - (parentRect?.left ?? -window.scrollX) + (parent?.scrollLeft ?? 0) - (parent?.clientLeft ?? 0)}px`,
        ...matchAnchorWidth ? { width: `${width}px` } : {},
        maxHeight: `${maxHeight}px`,
        overflowY: "auto",
        transformOrigin: above ? "bottom" : "top"
      });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(anchor);
    observer.observe(dropdown);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [isOpen, targetId, uid, position, offset, offsetLeft, offsetRight, matchAnchorWidth, dropDownRef]);
  return { dropdownPositionStyle };
};

// src/components/dropdown/hooks/useMemoizedOnOutsideClickExcludes.ts
import { useEffect as useEffect8, useState as useState8 } from "react";
var useMemoizedOnOutsideClickExcludes = (targetId, uid) => {
  const [onOutsideClickExcludes, setExcludes] = useState8([]);
  useEffect8(() => {
    setExcludes([getDropdownAnchorElement(targetId, uid)]);
  }, [targetId, uid]);
  return onOutsideClickExcludes;
};

// src/components/stack/context.ts
import { createContext as createContext2 } from "react";
var stackingOrder = {
  /**
   * Для компонентов с возможностью фокуса: кнопки, поля ввода
   */
  FOCUSED: 2,
  /**
   * Значение по-умолчанию
   */
  DEFAULT: 10,
  /**
   * Компоненты, которые управляют своей позицией, например, поповер, тултип
   */
  POPOVER: 50,
  /**
   * Для модальных окон с оверлеем
   */
  MODAL: 100,
  /**
   * Для тостов и нотификаций
   */
  SNACKBAR: 1e3
};
var StackingContext = createContext2(stackingOrder.DEFAULT);

// src/components/stack/Stack.tsx
import { useContext as useContext2 } from "react";
import { jsx as jsx26 } from "react/jsx-runtime";
var Stack = ({ children, value = stackingOrder.DEFAULT }) => {
  const previousValue = useContext2(StackingContext);
  const currentValue = Math.max(value, previousValue);
  const nextValue = currentValue + 1;
  return /* @__PURE__ */ jsx26(StackingContext.Provider, { value: nextValue, children: children(currentValue) });
};

// src/components/dropdown/Dropdown.tsx
import { Fragment as Fragment2, jsx as jsx27, jsxs as jsxs10 } from "react/jsx-runtime";
var b19 = block("dropdown");
var Dropdown = memo6(
  forwardRef8(
    ({
      as: Component = "div",
      children,
      isOpen = false,
      position = "start",
      onClickOutside,
      content,
      targetId,
      offset = 4,
      offsetLeft = 0,
      offsetRight = 0,
      withRelativeContainer,
      matchAnchorWidth = false,
      // className = '',
      // style,
      dataTestId,
      usePortal = true,
      portalContainer,
      forceRender = false,
      className = "",
      style = {},
      ...rest
    }, ref) => {
      const uid = useId();
      const withTargetId = Boolean(targetId);
      const isOpenWithDelay = useBooleanValueWithDelay({ value: isOpen, delay: 200 });
      const dropDownRef = useRef5(null);
      const { dropdownPositionStyle } = useCalculateTargetPosition({
        isOpen: isOpenWithDelay,
        targetId,
        position,
        dropDownRef,
        matchAnchorWidth,
        uid,
        offset,
        offsetLeft,
        offsetRight
      });
      const getAnchorElement = () => {
        if (withTargetId) return null;
        if (!React19.isValidElement(children)) {
          console.warn("\u0427\u0442\u043E\u0431\u044B \u043E\u0431\u0435\u0440\u043D\u0443\u0442\u044C \u043A\u043E\u043C\u043F\u043E\u043D\u0435\u043D\u0442 Dropdown, children \u0434\u043E\u043B\u0436\u0435\u043D \u0431\u044B\u0442\u044C \u0432\u0430\u043B\u0438\u0434\u043D\u044B\u043C React \u044D\u043B\u0435\u043C\u0435\u043D\u0442\u043E\u043C.");
          return null;
        }
        return React19.cloneElement(children, { "data-bcc-dropdown-anchor": uid });
      };
      const onOutsideClickExcludes = useMemoizedOnOutsideClickExcludes(targetId, uid);
      useClickOutside(dropDownRef, onClickOutside, onOutsideClickExcludes);
      return /* @__PURE__ */ jsxs10(Fragment2, { children: [
        getAnchorElement(),
        /* @__PURE__ */ jsx27(Stack, { value: stackingOrder.POPOVER, children: (computedZIndex) => /* @__PURE__ */ jsx27(DropdownPortal, { usePortal, portalContainer, children: /* @__PURE__ */ jsx27(
          DropdownRelativeContainer,
          {
            withRelativeContainer,
            className,
            style: { ...style, zIndex: computedZIndex },
            children: /* @__PURE__ */ jsx27(
              Component,
              {
                ...rest,
                ref: mergeRefs([ref, dropDownRef]),
                className: b19({ shown: isOpen }),
                style: { ...dropdownPositionStyle, position: "absolute", zIndex: computedZIndex },
                "data-test-id": dataTestId,
                children: forceRender || isOpenWithDelay ? content : null
              }
            )
          }
        ) }) })
      ] });
    }
  )
);

// src/hooks/useBoolean.ts
import { useCallback as useCallback5, useEffect as useEffect9, useRef as useRef6, useState as useState9 } from "react";
function useBoolean(init, options) {
  const [value, setValue] = useState9(init);
  const initialRunRef = useRef6(false);
  const { onTrue, onFalse, onToggle } = options || {};
  useEffect9(() => {
    if (!initialRunRef.current) {
      initialRunRef.current = true;
      return;
    }
    onToggle?.(value);
    if (value) {
      onTrue?.();
    } else {
      onFalse?.();
    }
  }, [value]);
  return {
    value,
    setValue,
    toggle: useCallback5(() => setValue((stateValue) => !stateValue), []),
    setTrue: useCallback5(() => setValue(true), []),
    setFalse: useCallback5(() => setValue(false), [])
  };
}

// src/components/select/components/ChevroneDownIcon/ChevroneDownIcon.tsx
import { memo as memo7 } from "react";
import { jsx as jsx28 } from "react/jsx-runtime";
var b20 = block("select-chevrone-down-icon");
var ChevroneDownIcon = memo7(({ isOpen }) => {
  return /* @__PURE__ */ jsx28(
    "svg",
    {
      width: "24",
      height: "24",
      viewBox: "0 0 24 24",
      fill: "none",
      xmlns: "http://www.w3.org/2000/svg",
      className: b20({ open: isOpen }),
      children: /* @__PURE__ */ jsx28(
        "path",
        {
          fillRule: "evenodd",
          clipRule: "evenodd",
          d: "M5.29289 9.29289C5.68342 8.90237 6.31658 8.90237 6.70711 9.29289L12 14.5858L17.2929 9.29289C17.6834 8.90237 18.3166 8.90237 18.7071 9.29289C19.0976 9.68342 19.0976 10.3166 18.7071 10.7071L12.7071 16.7071C12.3166 17.0976 11.6834 17.0976 11.2929 16.7071L5.29289 10.7071C4.90237 10.3166 4.90237 9.68342 5.29289 9.29289Z"
        }
      )
    }
  );
});

// src/components/select/components/SelectDropdownMenu/SelectDropdownMenu.tsx
import React22, { memo as memo8, useCallback as useCallback6 } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

// src/components/select/components/SelectOption/SelectOption.tsx
import { forwardRef as forwardRef9 } from "react";
import { jsx as jsx29, jsxs as jsxs11 } from "react/jsx-runtime";
var b21 = block("select-option");
var SelectOption = forwardRef9(
  ({ id, isActive, isSelected, labelWrap, hintWrap, onChange, style, dataIndex, ...option }, ref) => {
    const { label, value, hint, disabled, addonLeft, addonRight } = option;
    return /* @__PURE__ */ jsxs11(
      "div",
      {
        ref,
        id,
        "data-index": dataIndex,
        role: "option",
        "aria-label": label,
        "aria-selected": `${isSelected}`,
        "aria-disabled": disabled || void 0,
        className: b21({ selected: isSelected, active: isActive, disabled }),
        onMouseDown: (event) => event.preventDefault(),
        onClick: disabled ? void 0 : () => onChange?.(value),
        style,
        children: [
          /* @__PURE__ */ jsx29("div", { className: b21("addon"), children: addonLeft }),
          /* @__PURE__ */ jsxs11("div", { className: b21("optionWrapper"), children: [
            /* @__PURE__ */ jsx29("div", { className: b21("label", { [labelWrap]: true }), title: label, children: label }),
            /* @__PURE__ */ jsx29("div", { className: b21("hint", { [hintWrap]: true }), title: hint, children: hint })
          ] }),
          /* @__PURE__ */ jsx29("div", { className: b21("addon"), children: addonRight })
        ]
      }
    );
  }
);

// src/components/select/components/SelectDropdownMenu/components/SelectDropdownTextContainer/SelectDropdownTextContainer.tsx
import { jsx as jsx30 } from "react/jsx-runtime";
var b22 = block("select-dropdown-text-container");
var SelectDropdownTextContainer = ({ text, justify = "start" }) => {
  return /* @__PURE__ */ jsx30("div", { className: b22({ justify }), children: text });
};

// src/components/select/components/SelectDropdownMenu/utils.ts
var OptionsHeightMap = {
  "1": 56 + 8,
  "2": 56 * 2 + 8,
  "3": 56 * 3 + 8,
  "4": 56 * 4 + 8,
  "5": 56 * 5 + 8,
  "6": 56 * 6 + 8
};
var getVirtualListDropdownHeight = (count) => {
  if (count > 6) return OptionsHeightMap["6"];
  if (count < 1) return OptionsHeightMap["1"];
  return OptionsHeightMap[count];
};

// src/components/select/components/SelectDropdownMenu/SelectDropdownMenu.tsx
import { jsx as jsx31 } from "react/jsx-runtime";
var b23 = block("select-options");
var SelectDropdownMenu = ({ virtualize, ...props }) => {
  const { value, options, loading, onDeselect, onSelect, onChange } = props;
  const handleChange = useCallback6(
    (selectedValue) => {
      const isMultiple = Array.isArray(value);
      const isSelected = selectedValue === null ? false : isMultiple ? value?.includes(selectedValue) : value === selectedValue;
      if (isSelected) {
        onDeselect?.(selectedValue);
      } else {
        onSelect?.(selectedValue);
      }
      onChange?.(selectedValue);
    },
    [onChange, onSelect, onDeselect, value]
  );
  if (loading) return /* @__PURE__ */ jsx31(SelectDropdownTextContainer, { text: "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430..." });
  if (!options.length) return /* @__PURE__ */ jsx31(SelectDropdownTextContainer, { text: "\u041D\u0435\u0442 \u0434\u0430\u043D\u043D\u044B\u0445", justify: "center" });
  return virtualize ? /* @__PURE__ */ jsx31(SelectDropdownOptionsVirtualized, { ...props, onChange: handleChange }) : /* @__PURE__ */ jsx31(SelectDropdownOptions, { ...props, onChange: handleChange });
};
var SelectDropdownOptions = memo8(({ id, activeIndex, multiple, value, options, labelWrap, hintWrap, onChange }) => {
  return /* @__PURE__ */ jsx31("div", { id, role: "listbox", "aria-multiselectable": multiple || void 0, className: b23(), children: options.map((option, index) => {
    return /* @__PURE__ */ jsx31(
      SelectOption,
      {
        id: `${id}-option-${index}`,
        isActive: index === activeIndex,
        isSelected: Array.isArray(value) ? value.includes(option.value) : option.value === value,
        labelWrap,
        hintWrap,
        onChange,
        ...option
      },
      option.value
    );
  }) });
});
var SelectDropdownOptionsVirtualized = memo8(
  ({ id, activeIndex, multiple, value, options, labelWrap, hintWrap, onChange }) => {
    const parentRef = React22.useRef(null);
    const virtualizer = useVirtualizer({
      count: options.length,
      getScrollElement: () => parentRef.current,
      estimateSize: () => 56
    });
    const virtualOptions = virtualizer.getVirtualItems();
    return /* @__PURE__ */ jsx31("div", { id, role: "listbox", "aria-multiselectable": multiple || void 0, ref: parentRef, className: b23(), style: { height: getVirtualListDropdownHeight(virtualOptions.length) }, children: /* @__PURE__ */ jsx31("div", { className: b23("virtualListContainer"), style: { height: virtualizer.getTotalSize() }, children: /* @__PURE__ */ jsx31(
      "div",
      {
        className: b23("virtualListWrapper"),
        style: { transform: `translateY(${virtualOptions[0]?.start ?? 0}px)` },
        children: virtualOptions.map((virtualItem) => {
          const option = options[virtualItem.index];
          return /* @__PURE__ */ jsx31(
            SelectOption,
            {
              dataIndex: virtualItem.index,
              id: `${id}-option-${virtualItem.index}`,
              isActive: virtualItem.index === activeIndex,
              ref: virtualizer.measureElement,
              isSelected: Array.isArray(value) ? value.includes(option.value) : option.value === value,
              labelWrap,
              hintWrap,
              onChange,
              ...option
            },
            virtualItem.key
          );
        })
      }
    ) }) });
  }
);

// src/components/select/utils.ts
var getNewMultipleSelectValue = (selectedValue, currentValue) => {
  if (selectedValue === null) {
    return selectedValue;
  }
  if (Array.isArray(currentValue)) {
    if (currentValue.includes(selectedValue)) {
      return currentValue.filter((v) => v !== selectedValue);
    } else {
      return [...currentValue, selectedValue];
    }
  } else {
    return [selectedValue];
  }
};
var getSelectOptionsMap = (options) => {
  const initialValue = {};
  return options.reduce((acc, curr) => {
    return Object.assign(acc, { [curr.value]: curr.label });
  }, initialValue);
};
var getSelectFilteredOptions = (query, items) => {
  if (!query) return items;
  return items.filter((item) => item.label.toLowerCase().trim().includes(query.toLowerCase().trim()));
};
var getSelectPlaceholderValue = (mode, inputValue, placeholder) => {
  if (mode === "search") {
    return inputValue || placeholder;
  } else {
    return placeholder;
  }
};
var getInputSelectValue = (value, valueMap, separator = ", ") => {
  if (!value) return "";
  if (Array.isArray(value)) {
    return value.map((v) => valueMap[v]).join(separator);
  } else {
    return valueMap[value];
  }
};

// src/components/select/Select.tsx
import { jsx as jsx32, jsxs as jsxs12 } from "react/jsx-runtime";
var b24 = block("select");
var EMPTY_ARRAY = [];
var Select = memo9(
  ({
    value,
    options = EMPTY_ARRAY,
    multiple,
    allowSearch = true,
    closeAfterSelect = true,
    virtualize,
    loading,
    filterOptions = true,
    clearSearchValueSearchBlur = true,
    searchValue,
    onChange,
    onSelect,
    onDeselect,
    onOpen,
    onClose,
    onClear,
    onSearch,
    optionsWrap,
    className,
    style,
    name = "",
    ...restInputProps
  }) => {
    const inputRef = useRef7(null);
    const listId = useId2();
    const [activeIndex, setActiveIndex] = useState10(-1);
    const [focused] = useFocus(inputRef);
    const isControlled = typeof value !== "undefined";
    const isControlledSearch = typeof searchValue !== "undefined";
    const ValuesMap = useMemo3(() => getSelectOptionsMap(options), [options]);
    const { label: labelWrap = "ellipsis", hint: hintWrap = "ellipsis" } = optionsWrap || {};
    const {
      value: open,
      setTrue: setOpen,
      setFalse: setClose
    } = useBoolean(false, {
      onTrue: onOpen,
      onFalse: onClose
    });
    const [internalState, setInternalState] = useState10({
      mode: "value",
      search: "",
      options,
      value: null
    });
    const currentValue = isControlled ? value : internalState.value;
    const handleChange = useCallback7(
      (selectedValue) => {
        let newValue;
        if (multiple) {
          newValue = getNewMultipleSelectValue(selectedValue, currentValue);
        } else {
          newValue = selectedValue;
        }
        onChange?.({ value: newValue, name, target: { value: newValue } });
        setInternalState((prev) => ({ ...prev, value: newValue, search: "", options }));
        if (closeAfterSelect && !multiple) {
          setClose();
        }
      },
      [currentValue, multiple, options, closeAfterSelect, name, onChange, setClose]
    );
    const handleOnClear = useCallback7(() => {
      onClear?.();
      handleChange(null);
    }, [onClear, handleChange, focused]);
    const handleSearch = useCallback7(
      (_, payload) => {
        if (allowSearch && internalState.mode === "search") {
          const value2 = payload.value;
          setInternalState((prev) => ({
            ...prev,
            search: value2,
            options: filterOptions ? getSelectFilteredOptions(value2, options) : options
          }));
          onSearch?.(value2);
        }
      },
      [allowSearch, internalState.mode, filterOptions, onSearch, options]
    );
    useEffect10(() => {
      if (focused && allowSearch) {
        setInternalState((prev) => ({ ...prev, mode: "search" }));
      } else {
        if (clearSearchValueSearchBlur) onSearch?.("");
        setInternalState((prev) => ({ ...prev, mode: "value", search: "", options }));
      }
    }, [focused, allowSearch, clearSearchValueSearchBlur]);
    const optionsString = useMemo3(() => JSON.stringify(options), [options]);
    useEffect10(() => {
      setInternalState((prev) => ({ ...prev, options }));
    }, [optionsString]);
    const InputValue = getInputSelectValue(currentValue, ValuesMap);
    const SearchValue = isControlledSearch ? searchValue : internalState.search;
    const visibleOptions = internalState.options;
    const selectedIndex = visibleOptions.findIndex(
      (option) => !option.disabled && (Array.isArray(currentValue) ? currentValue.includes(option.value) : option.value === currentValue)
    );
    const focusedIndex = visibleOptions[activeIndex] && !visibleOptions[activeIndex].disabled ? activeIndex : selectedIndex >= 0 ? selectedIndex : visibleOptions.findIndex((option) => !option.disabled);
    useEffect10(() => {
      if (!open) return;
      document.getElementById(`${listId}-option-${focusedIndex}`)?.scrollIntoView({ block: "nearest" });
    }, [open, focusedIndex, listId]);
    const openMenu = () => {
      if (restInputProps.disabled) return;
      setActiveIndex(-1);
      setOpen();
    };
    const handleKeyDown2 = (event) => {
      if (restInputProps.disabled) return;
      if (event.key === "Escape") {
        if (open) {
          event.preventDefault();
          event.stopPropagation();
        }
        setClose();
      } else if (event.key === "Tab") {
        setClose();
      } else if (event.key === "Enter" || !allowSearch && event.key === " ") {
        event.preventDefault();
        if (!open) {
          openMenu();
          setActiveIndex(focusedIndex);
        } else if (focusedIndex >= 0 && !loading) {
          const option = visibleOptions[focusedIndex];
          const selected = Array.isArray(currentValue) ? currentValue.includes(option.value) : option.value === currentValue;
          (selected ? onDeselect : onSelect)?.(option.value);
          handleChange(option.value);
        }
      } else if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key) && (!allowSearch || open)) {
        event.preventDefault();
        const enabled = visibleOptions.map((option, index) => option.disabled ? -1 : index).filter((index) => index >= 0);
        if (!enabled.length) return;
        if (!open) {
          openMenu();
          setActiveIndex(focusedIndex);
          return;
        }
        const position = enabled.indexOf(focusedIndex);
        const next = event.key === "Home" ? 0 : event.key === "End" ? enabled.length - 1 : (position + (event.key === "ArrowDown" ? 1 : -1) + enabled.length) % enabled.length;
        setActiveIndex(enabled[next]);
      }
    };
    return /* @__PURE__ */ jsx32(
      Dropdown,
      {
        isOpen: open,
        onClickOutside: setClose,
        matchAnchorWidth: true,
        offset: restInputProps.hint || restInputProps.error ? -16 : 4,
        offsetLeft: 0,
        offsetRight: 0,
        "aria-hidden": !open,
        className,
        style,
        content: /* @__PURE__ */ jsx32(
          SelectDropdownMenu,
          {
            id: listId,
            activeIndex: activeIndex >= 0 ? focusedIndex : -1,
            multiple,
            value: currentValue,
            virtualize,
            loading,
            options: internalState.options,
            hintWrap,
            labelWrap,
            onChange: handleChange,
            onSelect,
            onDeselect
          }
        ),
        children: /* @__PURE__ */ jsx32(Box, { className: b24("inputWrapper", { fullWidth: restInputProps.fullWidth }), children: /* @__PURE__ */ jsx32(
          Input,
          {
            ...restInputProps,
            role: "combobox",
            "aria-label": restInputProps["aria-label"] ?? (typeof restInputProps.label === "string" ? restInputProps.label : void 0),
            "aria-expanded": open,
            "aria-controls": open ? listId : void 0,
            "aria-haspopup": "listbox",
            "aria-autocomplete": allowSearch ? "list" : "none",
            "aria-activedescendant": open && focusedIndex >= 0 && !loading ? `${listId}-option-${focusedIndex}` : void 0,
            readOnly: !allowSearch,
            autoComplete: "off",
            ref: inputRef,
            name,
            className: allowSearch ? void 0 : b24("hiddenCaret"),
            clear: internalState.mode === "value" && restInputProps.clear,
            showFocus: open,
            onChange: handleSearch,
            placeholder: getSelectPlaceholderValue(internalState.mode, InputValue, restInputProps.placeholder),
            value: internalState.mode === "search" ? SearchValue : InputValue,
            rightAddon: /* @__PURE__ */ jsxs12("div", { className: b24("rightAddons"), children: [
              restInputProps.rightAddon,
              /* @__PURE__ */ jsx32(ChevroneDownIcon, { isOpen: open })
            ] }),
            onFocus: allowSearch ? openMenu : void 0,
            onClick: allowSearch ? openMenu : () => open ? setClose() : openMenu(),
            onBlur: setClose,
            onKeyDown: handleKeyDown2,
            onClear: handleOnClear
          }
        ) })
      }
    );
  }
);

// src/components/segment-control/SegmentControl.tsx
import { forwardRef as forwardRef10, useRef as useRef8 } from "react";
import { jsx as jsx33, jsxs as jsxs13 } from "react/jsx-runtime";
var b25 = block("segmentControl");
var SegmentControl = forwardRef10(
  ({ children, childrenRef, onChange, selectedId = 0, size = "xs", shape = "rounded", items = [], className, ...restProps }, ref) => {
    const buttons = useRef8(/* @__PURE__ */ new Map());
    const selectedIndex = items.findIndex((item) => item.id === selectedId);
    const enabledItems = items.filter((item) => !item.disabled);
    const tabId = enabledItems.some((item) => item.id === selectedId) ? selectedId : enabledItems[0]?.id;
    return /* @__PURE__ */ jsxs13("ul", { ...restProps, ref, role: "radiogroup", className: b25({ size, shape }, className), children: [
      selectedIndex >= 0 && /* @__PURE__ */ jsx33("li", { "aria-hidden": "true", className: "plate", style: { width: `${100 / items.length}%`, left: `${100 * selectedIndex / items.length}%` } }),
      items.map(({ id, label, disabled }) => /* @__PURE__ */ jsx33("li", { role: "presentation", className: `tab-item ${id === selectedId ? "active" : ""}`, children: /* @__PURE__ */ jsx33(
        "button",
        {
          type: "button",
          role: "radio",
          "aria-checked": id === selectedId,
          disabled,
          tabIndex: id === tabId ? 0 : -1,
          ref: (node) => {
            if (node) buttons.current.set(id, node);
            else buttons.current.delete(id);
          },
          onClick: () => onChange?.(id),
          onKeyDown: (event) => {
            if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
            event.preventDefault();
            const current = enabledItems.findIndex((item) => item.id === id);
            const nextIndex = event.key === "Home" ? 0 : event.key === "End" ? enabledItems.length - 1 : (current + (event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 1) + enabledItems.length) % enabledItems.length;
            const next = enabledItems[nextIndex];
            if (next) {
              buttons.current.get(next.id)?.focus();
              onChange?.(next.id);
            }
          },
          children: /* @__PURE__ */ jsx33("span", { children: label })
        }
      ) }, id))
    ] });
  }
);

// src/theme/providers/ThemeProvider.tsx
import React26 from "react";

// src/theme/contants.ts
var DEFAULT_THEME = "system";
var DEFAULT_LIGHT_THEME = "light";
var DEFAULT_DARK_THEME = "dark";
var LIGHT_THEMES = ["bcc-light", "junior-light"];
var DARK_THEMES = ["bcc-dark", "junior-dark"];
var THEMES = [...LIGHT_THEMES, ...DARK_THEMES];

// src/theme/hooks/useSystemTheme.ts
import React23 from "react";

// src/theme/utils/getDarkMediaMatch.ts
var getDarkMediaMatch = () => window.matchMedia("(prefers-color-scheme: dark)");

// src/theme/utils/getSystemTheme.ts
function getSystemTheme() {
  if (typeof window === "object") {
    return getDarkMediaMatch().matches ? "dark" : "light";
  } else {
    return "light";
  }
}

// src/theme/hooks/useSystemTheme.ts
function addListener(matcher, handler) {
  const isLegacyMethod = typeof matcher.addEventListener !== "function";
  if (isLegacyMethod) {
    matcher.addListener(handler);
  } else {
    matcher.addEventListener("change", handler);
  }
  return () => {
    if (isLegacyMethod) {
      matcher.removeListener(handler);
    } else {
      matcher.removeEventListener("change", handler);
    }
  };
}
function useSystemTheme() {
  const [theme, setTheme] = React23.useState(getSystemTheme());
  React23.useEffect(() => {
    function onChange(event) {
      setTheme(event.matches ? "dark" : "light");
    }
    const matcher = getDarkMediaMatch();
    const unsubscribe = addListener(matcher, onChange);
    return () => unsubscribe();
  }, []);
  return theme;
}

// src/theme/utils/getBodyClassName.ts
var ROOT_CLASS_NAME = "root";
var bNew = blockNew(ROOT_CLASS_NAME);
var b26 = block(ROOT_CLASS_NAME);
function getDeprecatedRootClassName(modifier) {
  return b26(modifier);
}
function getRootClassName(modifier, addition) {
  return bNew(modifier, addition);
}

// src/theme/utils/updateBodyClassName.ts
var rootClassName = getDeprecatedRootClassName();
var rootNewClassName = getRootClassName();
function updateBodyClassName(newTheme, modifiers, customRootClassName, prevCustomRootClassName) {
  const bodyEl = document.body;
  if (!bodyEl.classList.contains(rootClassName)) {
    bodyEl.classList.add(rootClassName);
  }
  if (!bodyEl.classList.contains(rootNewClassName)) {
    bodyEl.classList.add(rootNewClassName);
  }
  if (prevCustomRootClassName) {
    const parsedPrevCustomRootClassNames = prevCustomRootClassName.split(" ");
    parsedPrevCustomRootClassNames.forEach((cls) => {
      if (cls) {
        bodyEl.classList.remove(cls);
      }
    });
  }
  if (customRootClassName) {
    const parsedCustomRootClassNames = customRootClassName.split(" ");
    parsedCustomRootClassNames.forEach((cls) => {
      if (cls && !bodyEl.classList.contains(cls)) {
        bodyEl.classList.add(cls);
      }
    });
  }
  [...bodyEl.classList].forEach((cls) => {
    if (cls.startsWith(modsClassName(getDeprecatedRootClassName({ theme: true })))) {
      bodyEl.classList.remove(cls);
    }
    if (cls.startsWith(modsClassName(getRootClassName({ theme: true })))) {
      bodyEl.classList.remove(cls);
    }
  });
  bodyEl.classList.add(modsClassName(getDeprecatedRootClassName({ theme: newTheme })));
  bodyEl.classList.add(modsClassName(getRootClassName({ theme: newTheme })));
}

// src/theme/providers/ThemeContext.ts
import React24 from "react";
var initialValueThemeContext = {
  theme: DEFAULT_THEME,
  themeValue: DEFAULT_LIGHT_THEME
};
var ThemeContext = React24.createContext(initialValueThemeContext);
ThemeContext.displayName = "ThemeContext";

// src/theme/providers/ThemeSettingsContext.ts
import React25 from "react";
var ThemeSettingsContext = React25.createContext(void 0);
ThemeSettingsContext.displayName = "ThemeSettingsContext";

// src/theme/providers/ThemeProvider.tsx
import { jsx as jsx34 } from "react/jsx-runtime";
function ThemeProvider({
  theme = DEFAULT_THEME,
  systemLightTheme = DEFAULT_LIGHT_THEME,
  systemDarkTheme = DEFAULT_DARK_THEME,
  nativeScrollbar = false,
  scoped = false,
  rootClassName: rootClassName2 = "",
  children,
  initialMediaQuery
}) {
  const systemTheme = useSystemTheme() === "light" ? systemLightTheme : systemDarkTheme;
  const themeValue = theme === "system" ? systemTheme : theme;
  const prevRootClassName = React26.useRef("");
  React26.useEffect(() => {
    if (!scoped) {
      updateBodyClassName(
        themeValue,
        { "native-scrollbar": nativeScrollbar },
        rootClassName2,
        prevRootClassName.current
      );
      prevRootClassName.current = rootClassName2;
    }
  }, [nativeScrollbar, themeValue, scoped, rootClassName2]);
  const contextValue = React26.useMemo(
    () => ({
      theme,
      themeValue
    }),
    [theme, themeValue]
  );
  const themeSettingsContext = React26.useMemo(
    () => ({ systemLightTheme, systemDarkTheme }),
    [systemLightTheme, systemDarkTheme]
  );
  return /* @__PURE__ */ jsx34(ThemeContext.Provider, { value: contextValue, children: /* @__PURE__ */ jsx34(ThemeSettingsContext.Provider, { value: themeSettingsContext, children: /* @__PURE__ */ jsx34(LayoutProvider, { initialMediaQuery, children: scoped ? /* @__PURE__ */ jsx34(
    "div",
    {
      className: getRootClassName({ theme: themeValue, "native-scrollbar": nativeScrollbar }, [
        getDeprecatedRootClassName({
          theme: themeValue,
          "native-scrollbar": nativeScrollbar
        }),
        rootClassName2
      ]),
      children
    }
  ) : children }) }) });
}
ThemeProvider.displayName = "ThemeProvider";
export {
  Button,
  Card,
  EButtonVariant,
  BaseFormControl as FormControl,
  Input,
  SegmentControl,
  Select,
  Slider2 as Slider,
  Textarea,
  ThemeProvider,
  Typography,
  prepareSliderInnerState
};
