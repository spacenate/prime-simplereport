package gov.cdc.usds.simplereport.api;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.context.request.RequestContextListener;
import org.springframework.web.servlet.DispatcherServlet;

@Configuration
public class ContextHolderDispatcherServlet {
    @Bean
    DispatcherServlet dispatcherServlet() {
        DispatcherServlet srvl = new DispatcherServlet();
        srvl.setThreadContextInheritable(true);
        return srvl;
    }
}
