// Liquid Glass material from iOS 26: a translucent, saturated blur with a bright specular
// rim and a soft lift shadow. Controls that float above content share this treatment.
export const iosGlassClassName =
  "bg-(--ios-glass) backdrop-blur-[22px] backdrop-saturate-[1.9] shadow-[inset_0_0.5px_0_0.5px_var(--ios-glass-edge),inset_0_-0.5px_0_0_rgb(0_0_0/0.04),0_6px_20px_var(--ios-glass-shadow),0_0_0_0.5px_rgb(0_0_0/0.06)]";

// The denser variant used for menus, alerts, and sheets that carry text.
export const iosStrongGlassClassName =
  "bg-(--ios-glass-strong) backdrop-blur-[30px] backdrop-saturate-[1.9] shadow-[inset_0_0.5px_0_0.5px_var(--ios-glass-edge),0_16px_48px_var(--ios-glass-shadow),0_0_0_0.5px_rgb(0_0_0/0.06)]";
