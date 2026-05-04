package com.mazhar1785.smartscadmobile

import com.facebook.react.modules.network.OkHttpClientFactory
import com.facebook.react.modules.network.OkHttpClientProvider
import okhttp3.OkHttpClient
import javax.net.ssl.HostnameVerifier
import javax.net.ssl.HttpsURLConnection

/**
 * UAT-only TLS workaround for the SmartSCAD mobile API host.
 *
 * The UAT F5 in front of `uatmobileapi.adsmartsupport.ae` is currently
 * presenting a `*.scad.gov.ae` SSL certificate (it is the default cert
 * on a shared VIP that also serves jirabeta.scad.gov.ae). The cert
 * chain itself is valid (Sectigo CA), but the hostname does not match,
 * so Android's network stack (correctly) refuses the connection with a
 * hostname-mismatch error, which surfaces in the app as `FETCH_ERROR`.
 *
 * Until the infra team binds the existing `*.adsmartsupport.ae`
 * certificate to the SNI for `uatmobileapi.adsmartsupport.ae`, we
 * install an OkHttpClient that skips ONLY hostname verification, and
 * ONLY for the single UAT host listed in `BYPASS_HOSTS`. The full
 * certificate chain is still validated against the system trust store,
 * and every other host still uses the default hostname verifier. This
 * is safe to ship for UAT and must be removed before the production
 * release once the certificate binding on the F5 is corrected.
 */
object SmartScadUnsafeOkHttpClientFactory : OkHttpClientFactory {

    private val BYPASS_HOSTS = setOf(
        "uatmobileapi.adsmartsupport.ae"
    )

    override fun createNewNetworkModuleClient(): OkHttpClient {
        val defaultHostnameVerifier = HttpsURLConnection.getDefaultHostnameVerifier()

        val verifier = HostnameVerifier { hostname, session ->
            if (hostname != null && BYPASS_HOSTS.contains(hostname.lowercase())) {
                true
            } else {
                defaultHostnameVerifier.verify(hostname, session)
            }
        }

        return OkHttpClientProvider.createClientBuilder()
            .hostnameVerifier(verifier)
            .build()
    }
}
