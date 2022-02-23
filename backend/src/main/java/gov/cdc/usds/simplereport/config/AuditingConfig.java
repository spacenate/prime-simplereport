package gov.cdc.usds.simplereport.config;

import static org.springframework.web.context.request.RequestAttributes.SCOPE_REQUEST;

import gov.cdc.usds.simplereport.db.model.ApiUser;
import gov.cdc.usds.simplereport.service.ApiUserService;
import java.util.Optional;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.AuditorAware;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;

// @Configuration
@Component
// if you take away this JPA Auditing annotation, created_at and updated_at won't populate

@Slf4j
public class AuditingConfig implements AuditorAware<ApiUser> {

  @Autowired private ApiUserService _userService;

  @Override
  public Optional<ApiUser> getCurrentAuditor() {
    log.debug("Fetching current user for audit");
    System.out.println("BOOYAH");
    System.out.println(
        RequestContextHolder.currentRequestAttributes().getAttribute("context", SCOPE_REQUEST));
    Optional<ApiUser> user = Optional.of(_userService.getCurrentApiUserInContainedTransaction());
    return user;
    //        return (String) RequestContextHolder
    //                .currentRequestAttributes()
    //                .getAttribute("Username", SCOPE_REQUEST);
  }

  // this is used to generate the created_by and updated_by fields for most tables in the database
  //  @Bean
  //  @RequestScope
  //  public AuditorAware<ApiUser> getCurrentApiUserProvider(ApiUserService userService) {
  //    return () -> {
  //      log.debug("Fetching current user for audit");
  //      Optional<ApiUser> user =
  // Optional.of(userService.getCurrentApiUserInContainedTransaction());
  //      return user;
  //    };
  //  }
}
