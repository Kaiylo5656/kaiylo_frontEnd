import React from "react";

const BorderBeam = ({
    className,
    size = 200,
    duration = 15,
    anchor = 90,
    borderWidth = 1.5,
    colorFrom = "#d4845a",
    colorTo = "transparent",
    delay = 0,
    radius = 0,
    oneShot = false,
    distance = 100,
    ...props
}) => {
    return (
        <div
            style={{
                "--size": size,
                "--duration": duration,
                "--anchor": anchor,
                "--border-width": borderWidth,
                "--color-from": colorFrom,
                "--color-to": colorTo,
                "--delay": delay,
                "--radius": radius,
                "--border-beam-distance": `${distance}%`,
            }}
            className={`absolute inset-[0] rounded-[inherit] [border:calc(var(--border-width)*1px)_solid_transparent] 
      ![mask-clip:padding-box,border-box] ![mask-composite:intersect] 
      [mask:linear-gradient(transparent,transparent),linear-gradient(white,white)] 
      after:absolute after:aspect-square after:w-[calc(var(--size)*1px)] 
      after:animate-border-beam after:[animation-delay:var(--delay)s] 
      after:[background:linear-gradient(to_left,var(--color-from),var(--color-to),transparent)] 
      after:[offset-anchor:calc(var(--anchor)*1%)_50%] 
      after:[offset-path:rect(0_auto_auto_0_round_calc(var(--radius)*1px))] 
      after:drop-shadow-[0_0_15px_var(--color-from)]
      ${oneShot ? "after:[animation-iteration-count:1] after:[animation-fill-mode:forwards]" : ""} 
      ${className}`}
            {...props}
        />
    );
};

export default BorderBeam;
