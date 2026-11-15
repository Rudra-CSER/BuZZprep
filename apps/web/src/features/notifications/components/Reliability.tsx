export function Reliability() {
  return (
    <details className="group rounded-[14px] border bg-card px-4 py-3">
      <summary className="cursor-pointer list-none text-[15px] font-medium marker:hidden">
        How reliable are reminders?
      </summary>
      <div className="mt-3 grid gap-2 text-[14px] leading-relaxed text-muted-foreground">
        <p>
          Reminders are scheduled and sent by the buZZprep server through Apple’s, Google’s or
          Mozilla’s push service. They don’t depend on the app being open, and nothing relies on
          timers inside the browser.
        </p>
        <p>
          Delivery still depends on things outside the app: the device being online, iOS Focus or Do
          Not Disturb, Low Power Mode, and notification settings. Push services usually deliver
          within seconds but don’t guarantee it.
        </p>
        <p>
          On iPhone, notifications need iOS 16.4 or later and the Home Screen app. Action buttons
          (Done, Snooze) aren’t shown on iOS — tapping a reminder opens it in the app with those
          actions.
        </p>
        <p>
          If a server is offline for a while, stale reminders are dropped instead of arriving late
          in a burst.
        </p>
      </div>
    </details>
  );
}
