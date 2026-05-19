package com.rentybase.app;

import android.os.Bundle;
import android.webkit.JavascriptInterface;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Injected before any JS runs — window.__RentyBase.isNative() === true
        // Used by signin/signup to switch to the Capacitor Browser deep-link OAuth flow.
        getBridge().getWebView().addJavascriptInterface(new NativeBridge(), "__RentyBase");
    }

    public static class NativeBridge {
        @JavascriptInterface
        public boolean isNative() {
            return true;
        }
    }
}
