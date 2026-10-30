package com.financeflow.services;

import com.plaid.client.PlaidClient;
import com.plaid.client.request.LinkTokenCreateRequest;
import com.plaid.client.request.ItemPublicTokenExchangeRequest;
import com.plaid.client.response.LinkTokenCreateResponse;
import com.plaid.client.response.ItemPublicTokenExchangeResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import retrofit2.Response;

import java.io.IOException;
import java.util.Arrays;

@Service
public class PlaidService {

    private final PlaidClient plaidClient;

    @Value("${plaid.client.id}")
    private String clientId;

    public PlaidService(PlaidClient plaidClient) {
        this.plaidClient = plaidClient;
    }

    public String createLinkToken(String userId) throws IOException {
        LinkTokenCreateRequest.User user = new LinkTokenCreateRequest.User(userId);
        
        LinkTokenCreateRequest request = new LinkTokenCreateRequest(
            user,
            "FinanceFlow Pro",
            Arrays.asList("transactions"),
            Arrays.asList("US"),
            "en"
        );

        Response<LinkTokenCreateResponse> response = plaidClient.service().linkTokenCreate(request).execute();
        
        if (response.isSuccessful()) {
            return response.body().getLinkToken();
        } else {
            throw new RuntimeException("Failed to create Plaid link token: " + response.errorBody().string());
        }
    }

    public String exchangePublicToken(String publicToken) throws IOException {
        ItemPublicTokenExchangeRequest request = new ItemPublicTokenExchangeRequest(publicToken);
        Response<ItemPublicTokenExchangeResponse> response = plaidClient.service().itemPublicTokenExchange(request).execute();

        if (response.isSuccessful()) {
            return response.body().getAccessToken();
        } else {
            throw new RuntimeException("Failed to exchange Plaid public token: " + response.errorBody().string());
        }
    }
}
