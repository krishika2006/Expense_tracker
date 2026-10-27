package com.financeflow.controllers;

import com.financeflow.services.PlaidService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.Map;

@RestController
@RequestMapping("/api/plaid")
public class PlaidController {

    @Autowired
    private PlaidService plaidService;

    @PostMapping("/link-token")
    public Map<String, String> createLinkToken(@RequestBody Map<String, String> payload) throws IOException {
        String userId = payload.get("userId");
        String linkToken = plaidService.createLinkToken(userId);
        return Map.of("link_token", linkToken);
    }

    @PostMapping("/exchange-token")
    public Map<String, String> exchangeToken(@RequestBody Map<String, String> payload) throws IOException {
        String publicToken = payload.get("publicToken");
        String accessToken = plaidService.exchangePublicToken(publicToken);
        
        // In a real app, you would save this accessToken to the database linked to the user
        // and start a background sync for transactions.
        
        return Map.of("status", "success");
    }
}
